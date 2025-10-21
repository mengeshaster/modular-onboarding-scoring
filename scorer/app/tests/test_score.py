import pytest
from fastapi.testclient import TestClient
from app.main import app, calculate_score, ParsedData, PersonalInfo, Preferences


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def valid_headers():
    """Valid headers with internal token."""
    return {"X-Internal-Token": "dev-internal-token"}


class TestScoringLogic:
    """Test the core scoring logic."""
    
    def test_base_score(self):
        """Test that base score is 50 with no data."""
        parsed_data = ParsedData()
        score, explanation = calculate_score(parsed_data)
        assert score == 50
        assert "50" in explanation
    
    def test_income_scoring(self):
        """Test income-based scoring."""
        # High income
        parsed_data = ParsedData(
            personalInfo=PersonalInfo(income=120000)
        )
        score, _ = calculate_score(parsed_data)
        assert score >= 80  # Base 50 + 30 income bonus
        
        # Medium income
        parsed_data = ParsedData(
            personalInfo=PersonalInfo(income=60000)
        )
        score, _ = calculate_score(parsed_data)
        assert score >= 60  # Base 50 + 10 income bonus
        
        # Low income
        parsed_data = ParsedData(
            personalInfo=PersonalInfo(income=25000)
        )
        score, _ = calculate_score(parsed_data)
        assert score == 50  # Base score only
    
    def test_risk_flags_penalty(self):
        """Test that risk flags reduce score."""
        # No flags
        parsed_data = ParsedData(flags=[])
        score_no_flags, _ = calculate_score(parsed_data)
        
        # With flags
        parsed_data = ParsedData(flags=["debt", "bankruptcy"])
        score_with_flags, _ = calculate_score(parsed_data)
        
        assert score_with_flags < score_no_flags
        assert score_with_flags == score_no_flags - 20  # 2 flags * 10 penalty each
    
    def test_score_boundaries(self):
        """Test that score is always between 0 and 100."""
        # Test minimum boundary
        parsed_data = ParsedData(
            flags=["flag1", "flag2", "flag3", "flag4", "flag5", "flag6"]  # 60 penalty
        )
        score, _ = calculate_score(parsed_data)
        assert score >= 0
        
        # Test maximum boundary with high income
        parsed_data = ParsedData(
            personalInfo=PersonalInfo(
                income=150000,
                age=30,
                employment="full-time"
            ),
            preferences=Preferences(riskTolerance="moderate"),
            flags=[]
        )
        score, _ = calculate_score(parsed_data)
        assert score <= 100
    
    def test_employment_bonus(self):
        """Test employment status bonuses."""
        base_data = ParsedData(personalInfo=PersonalInfo(income=50000))
        base_score, _ = calculate_score(base_data)
        
        # Full-time employment
        full_time_data = ParsedData(
            personalInfo=PersonalInfo(income=50000, employment="full-time")
        )
        full_time_score, _ = calculate_score(full_time_data)
        assert full_time_score == base_score + 5
        
        # Self-employed
        self_employed_data = ParsedData(
            personalInfo=PersonalInfo(income=50000, employment="self-employed")
        )
        self_employed_score, _ = calculate_score(self_employed_data)
        assert self_employed_score == base_score + 3
    
    def test_age_bonus(self):
        """Test age-based scoring."""
        # Optimal age range
        optimal_age_data = ParsedData(
            personalInfo=PersonalInfo(age=35)
        )
        score, _ = calculate_score(optimal_age_data)
        assert score == 55  # Base 50 + 5 age bonus
        
        # Good age range
        good_age_data = ParsedData(
            personalInfo=PersonalInfo(age=22)
        )
        score, _ = calculate_score(good_age_data)
        assert score == 52  # Base 50 + 2 age bonus


class TestAPIEndpoints:
    """Test the API endpoints."""
    
    def test_health_endpoint(self, client):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data
        assert "version" in data
    
    def test_root_endpoint(self, client):
        """Test root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "Onboarding Scoring Service"
        assert data["status"] == "running"
    
    def test_score_endpoint_success(self, client, valid_headers):
        """Test successful score calculation."""
        request_data = {
            "userId": "123e4567-e89b-12d3-a456-426614174000",
            "parsedData": {
                "personalInfo": {
                    "age": 30,
                    "income": 75000,
                    "employment": "full-time"
                },
                "preferences": {
                    "riskTolerance": "moderate"
                },
                "flags": []
            }
        }
        
        response = client.post("/score", json=request_data, headers=valid_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "score" in data
        assert "explanation" in data
        assert 0 <= data["score"] <= 100
        assert isinstance(data["explanation"], str)
        assert len(data["explanation"]) > 0
    
    def test_score_endpoint_missing_token(self, client):
        """Test score endpoint without internal token."""
        request_data = {
            "userId": "123e4567-e89b-12d3-a456-426614174000",
            "parsedData": {
                "personalInfo": {"age": 30},
                "flags": []
            }
        }
        
        response = client.post("/score", json=request_data)
        assert response.status_code == 401
    
    def test_score_endpoint_invalid_token(self, client):
        """Test score endpoint with invalid internal token."""
        request_data = {
            "userId": "123e4567-e89b-12d3-a456-426614174000",
            "parsedData": {
                "personalInfo": {"age": 30},
                "flags": []
            }
        }
        
        headers = {"X-Internal-Token": "invalid-token"}
        response = client.post("/score", json=request_data, headers=headers)
        assert response.status_code == 401
    
    def test_score_endpoint_minimal_data(self, client, valid_headers):
        """Test score endpoint with minimal data."""
        request_data = {
            "userId": "123e4567-e89b-12d3-a456-426614174000",
            "parsedData": {}
        }
        
        response = client.post("/score", json=request_data, headers=valid_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["score"] == 50  # Should return base score
    
    def test_score_endpoint_invalid_data(self, client, valid_headers):
        """Test score endpoint with invalid request data."""
        request_data = {
            "userId": "invalid-user-id",  # Missing parsedData
        }
        
        response = client.post("/score", json=request_data, headers=valid_headers)
        assert response.status_code == 422  # Validation error


if __name__ == "__main__":
    pytest.main([__file__, "-v"])