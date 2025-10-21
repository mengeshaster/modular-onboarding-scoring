-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create onboarding_sessions table
CREATE TABLE onboarding_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    raw_input JSONB NOT NULL,
    parsed_data JSONB NOT NULL,
    score INT CHECK (score BETWEEN 0 AND 100),
    score_explanation TEXT,
    source_ip INET,
    user_agent TEXT
);

-- Create index for efficient user queries
CREATE INDEX idx_onboarding_sessions_user_created 
ON onboarding_sessions (user_id, created_at DESC);

-- Create index for ID lookups
CREATE INDEX idx_onboarding_sessions_id 
ON onboarding_sessions (id);