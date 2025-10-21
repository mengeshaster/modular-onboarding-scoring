from fastapi import FastAPI, HTTPException, Depends, status, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
import os
import logging
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Pydantic models
class PersonalInfo(BaseModel):
    age: Optional[int] = None
    income: Optional[float] = None
    employment: Optional[str] = None
    education: Optional[str] = None


class Preferences(BaseModel):
    riskTolerance: Optional[str] = None
    investmentGoals: Optional[List[str]] = None
    timeHorizon: Optional[str] = None


class ParsedData(BaseModel):
    personalInfo: Optional[PersonalInfo] = None
    preferences: Optional[Preferences] = None
    flags: Optional[List[str]] = None


class ScoreRequest(BaseModel):
    userId: str = Field(..., description="User identifier")
    parsedData: ParsedData = Field(..., description="Parsed onboarding data")


class ScoreResponse(BaseModel):
    score: int = Field(..., ge=0, le=100, description="Calculated score (0-100)")
    explanation: str = Field(..., description="Human-readable score explanation")


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str


# Configuration
INTERNAL_TOKEN = os.getenv("INTERNAL_SCORER_TOKEN", "dev-internal-token")
PORT = int(os.getenv("SCORER_PORT", "8000"))


# Dependency for internal token validation
async def verify_internal_token(x_internal_token: str = Header(None)) -> str:
    if not x_internal_token:
        logger.warning("Request without internal token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Internal token required in X-Internal-Token header",
        )
    
    if x_internal_token != INTERNAL_TOKEN:
        logger.warning(f"Invalid internal token: {x_internal_token}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal token",
        )
    
    return x_internal_token


# Startup/shutdown lifecycle
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Scorer service starting up...")
    yield
    logger.info("Scorer service shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Onboarding Scoring Service",
    description="Microservice for calculating onboarding scores",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def calculate_score(parsed_data: ParsedData) -> tuple[int, str]:
    """
    Calculate onboarding score based on deterministic rules.
    
    Rules:
    - Base score: 50 points
    - Income bonus: up to +30 points based on income level
    - Risk penalties: -10 points per risk flag
    - Final score: clamped between 0-100
    """
    score = 50  # Base score
    explanations = []
    
    # Income-based scoring
    if parsed_data.personalInfo and parsed_data.personalInfo.income:
        income = parsed_data.personalInfo.income
        if income >= 100000:
            bonus = 30
            explanations.append("Excellent income (+30)")
        elif income >= 75000:
            bonus = 20
            explanations.append("Very good income (+20)")
        elif income >= 50000:
            bonus = 10
            explanations.append("Good income (+10)")
        elif income >= 30000:
            bonus = 5
            explanations.append("Moderate income (+5)")
        else:
            bonus = 0
            explanations.append("Lower income (no bonus)")
        score += bonus
    else:
        explanations.append("No income information provided")
    
    # Employment status bonus
    if parsed_data.personalInfo and parsed_data.personalInfo.employment:
        employment = parsed_data.personalInfo.employment
        if employment == "full-time":
            score += 5
            explanations.append("Full-time employment (+5)")
        elif employment == "self-employed":
            score += 3
            explanations.append("Self-employed (+3)")
        elif employment == "part-time":
            score += 1
            explanations.append("Part-time employment (+1)")
        else:
            explanations.append(f"Employment status: {employment}")
    
    # Age factor
    if parsed_data.personalInfo and parsed_data.personalInfo.age:
        age = parsed_data.personalInfo.age
        if 25 <= age <= 45:
            score += 5
            explanations.append("Optimal age range (+5)")
        elif 18 <= age <= 24 or 46 <= age <= 65:
            score += 2
            explanations.append("Good age range (+2)")
    
    # Risk tolerance
    if parsed_data.preferences and parsed_data.preferences.riskTolerance:
        risk_tolerance = parsed_data.preferences.riskTolerance
        if risk_tolerance == "moderate":
            score += 5
            explanations.append("Moderate risk tolerance (+5)")
        elif risk_tolerance == "low":
            score += 3
            explanations.append("Conservative risk tolerance (+3)")
        elif risk_tolerance == "high":
            score += 2
            explanations.append("Aggressive risk tolerance (+2)")
    
    # Risk flags penalty
    if parsed_data.flags:
        penalty = len(parsed_data.flags) * 10
        score -= penalty
        if penalty > 0:
            explanations.append(f"Risk flags penalty (-{penalty})")
    
    # Clamp score between 0 and 100
    score = max(0, min(100, score))
    
    # Create explanation
    explanation = f"Score: {score}/100. " + "; ".join(explanations)
    
    logger.info(f"Calculated score: {score}, explanation: {explanation}")
    
    return score, explanation


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    from datetime import datetime
    return HealthResponse(
        status="ok",
        timestamp=datetime.utcnow().isoformat() + "Z",
        version="1.0.0"
    )


@app.post("/score", response_model=ScoreResponse)
async def calculate_onboarding_score(
    request: ScoreRequest,
    token: str = Depends(verify_internal_token)
) -> ScoreResponse:
    """
    Calculate onboarding score for a user based on their parsed data.
    
    This endpoint requires internal authentication via X-Internal-Token header.
    """
    try:
        logger.info(f"Calculating score for user: {request.userId}")
        
        score, explanation = calculate_score(request.parsedData)
        
        response = ScoreResponse(score=score, explanation=explanation)
        
        logger.info(f"Score calculated successfully for user {request.userId}: {score}")
        
        return response
        
    except Exception as e:
        logger.error(f"Error calculating score for user {request.userId}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error calculating score"
        )


@app.get("/")
async def root():
    """Root endpoint with basic service information."""
    return {
        "service": "Onboarding Scoring Service",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")