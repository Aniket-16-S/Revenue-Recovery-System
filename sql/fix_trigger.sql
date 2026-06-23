CREATE OR REPLACE FUNCTION calculate_financials()
RETURNS trigger AS $$
BEGIN
    
    NEW.total_outstanding := COALESCE(NEW.arrears, 0) + COALESCE(NEW.penalty, 0) + COALESCE(NEW.interest, 0);



    IF NEW.total_outstanding >= 100000 THEN
        NEW.risk_level := 'CRITICAL';
    ELSIF NEW.total_outstanding >= 50000 THEN
        NEW.risk_level := 'HIGH';
    ELSIF NEW.total_outstanding >= 10000 THEN
        NEW.risk_level := 'MEDIUM';
    ELSE
        NEW.risk_level := 'LOW';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
