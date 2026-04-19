-- Cek apa yang sudah ada di database
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

SELECT typname FROM pg_type WHERE typname IN ('OnboardingStatus', 'ValidatorStatus', 'ValidatorRole', 'SwapStatus');

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'validators';
