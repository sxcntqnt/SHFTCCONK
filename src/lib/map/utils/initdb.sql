-- ============================================
-- PostGIS Database Initialization
-- Nairobi Transit Intelligence Platform
-- ============================================

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS h3;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ============================================
-- Tables
-- ============================================

-- Traffic Nodes (Terminus, Interchanges, Staging Points)
CREATE TABLE IF NOT EXISTS traffic_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    geom GEOMETRY(Point, 4326) NOT NULL,
    node_type VARCHAR(50) NOT NULL CHECK (node_type IN ('terminus', 'interchange', 'staging_point')),
    passenger_throughput INTEGER DEFAULT 0,
    average_dwell_time INTEGER DEFAULT 0, -- seconds
    peak_hour TIME DEFAULT '08:00:00',
    saturation_level DECIMAL(3,2) DEFAULT 0 CHECK (saturation_level >= 0 AND saturation_level <= 1),
    connected_routes UUID[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial index
CREATE INDEX IF NOT EXISTS idx_traffic_nodes_geom ON traffic_nodes USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_traffic_nodes_type ON traffic_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_traffic_nodes_saturation ON traffic_nodes(saturation_level DESC);

-- Corridors (Routes between nodes)
CREATE TABLE IF NOT EXISTS corridor_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    start_node UUID REFERENCES traffic_nodes(id),
    end_node UUID REFERENCES traffic_nodes(id),
    geom GEOMETRY(LineString, 4326) NOT NULL,
    fuel_burn_rate DECIMAL(6,2) DEFAULT 0, -- liters per km
    idling_hotspot_score DECIMAL(5,2) DEFAULT 0, -- 0-100
    vehicle_stress_index DECIMAL(5,2) DEFAULT 0, -- 0-100
    average_speed DECIMAL(5,2) DEFAULT 0, -- km/h
    peak_flow_time TIME DEFAULT '08:30:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corridors_geom ON corridor_analytics USING GIST(geom);

-- Vehicles (GPS-tracked matatus)
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sacco_id UUID NOT NULL,
    plate_number VARCHAR(20) NOT NULL UNIQUE,
    capacity INTEGER DEFAULT 14,
    position GEOMETRY(Point, 4326) NOT NULL,
    heading DECIMAL(5,2) DEFAULT 0, -- degrees
    speed DECIMAL(5,2) DEFAULT 0, -- km/h
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'idle', 'maintenance', 'reserved')),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_position ON vehicles USING GIST(position);
CREATE INDEX IF NOT EXISTS idx_vehicles_sacco ON vehicles(sacco_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

-- SACCOs (Matatu owner cooperatives)
CREATE TABLE IF NOT EXISTS saccos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(20) UNIQUE,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    vehicle_count INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saccos_name ON saccos(name);

-- H3 Cells (Hexagonal grid data)
CREATE TABLE IF NOT EXISTS h3_cells (
    h3_cell_id VARCHAR(20) PRIMARY KEY,
    resolution INTEGER NOT NULL,
    h3_boundary GEOMETRY(Polygon, 4326) NOT NULL,
    h3_center GEOMETRY(Point, 4326) NOT NULL,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_h3_cells_geom ON h3_cells USING GIST(h3_boundary);
CREATE INDEX IF NOT EXISTS idx_h3_cells_resolution ON h3_cells(resolution);

-- Reservations
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    organization_name VARCHAR(255) NOT NULL,
    route_id UUID REFERENCES corridor_analytics(id),
    vehicle_id UUID REFERENCES vehicles(id),
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    passenger_count INTEGER DEFAULT 0,
    pickup_point GEOMETRY(Point, 4326) NOT NULL,
    dropoff_point GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_org ON reservations(organization_id);
CREATE INDEX IF NOT EXISTS idx_reservations_vehicle ON reservations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reservations_schedule ON reservations(scheduled_start, scheduled_end);

-- ============================================
-- Functions
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for traffic_nodes
DROP TRIGGER IF EXISTS update_traffic_nodes_updated_at ON traffic_nodes;
CREATE TRIGGER update_traffic_nodes_updated_at
    BEFORE UPDATE ON traffic_nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger for corridor_analytics
DROP TRIGGER IF EXISTS update_corridors_updated_at ON corridor_analytics;
CREATE TRIGGER update_corridors_updated_at
    BEFORE UPDATE ON corridor_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger for vehicles
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to notify on table changes
CREATE OR REPLACE FUNCTION notify_map_update()
RETURNS TRIGGER AS $$
DECLARE
    payload JSON;
BEGIN
    IF TG_OP = 'DELETE' THEN
        payload = json_build_object(
            'type', TG_TABLE_NAME,
            'action', 'delete',
            'data', row_to_json(OLD)
        );
    ELSE
        payload = json_build_object(
            'type', TG_TABLE_NAME,
            'action', TG_OP,
            'data', row_to_json(NEW)
        );
    END IF;
    
    PERFORM pg_notify('map_updates', payload::text);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for notifications
DROP TRIGGER IF EXISTS vehicles_notify ON vehicles;
CREATE TRIGGER vehicles_notify
    AFTER INSERT OR UPDATE OR DELETE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION notify_map_update();

DROP TRIGGER IF EXISTS traffic_nodes_notify ON traffic_nodes;
CREATE TRIGGER traffic_nodes_notify
    AFTER INSERT OR UPDATE ON traffic_nodes
    FOR EACH ROW EXECUTE FUNCTION notify_map_update();

DROP TRIGGER IF EXISTS corridor_analytics_notify ON corridor_analytics;
CREATE TRIGGER corridor_analytics_notify
    AFTER INSERT OR UPDATE ON corridor_analytics
    FOR EACH ROW EXECUTE FUNCTION notify_map_update();

-- ============================================
-- Views
-- ============================================

-- View for H3 cell metrics
CREATE OR REPLACE VIEW h3_metrics AS
SELECT 
    h.h3_cell_id,
    h.resolution,
    ST_AsGeoJSON(h.h3_boundary)::json -> 'coordinates' as boundary,
    ST_AsGeoJSON(h.h3_center)::json -> 'coordinates' as center,
    COUNT(t.id) as node_count,
    COALESCE(SUM(t.passenger_throughput), 0) as total_throughput,
    COALESCE(AVG(t.saturation_level), 0) as avg_saturation,
    COUNT(v.id) as vehicle_count
FROM h3_cells h
LEFT JOIN traffic_nodes t ON ST_Within(t.geom, h.h3_boundary)
LEFT JOIN vehicles v ON ST_Within(v.position, h.h3_boundary) AND v.status = 'active'
GROUP BY h.h3_cell_id, h.resolution, h.h3_boundary, h.h3_center;

-- ============================================
-- Seed Data (Sample Nairobi Locations)
-- ============================================

-- Insert sample SACCOs
INSERT INTO saccos (id, name, code, verified) VALUES
    ('a1111111-1111-1111-1111-111111111111', 'Nyama Choma Express', 'NCE', true),
    ('a2222222-2222-2222-2222-222222222222', 'Double M Matatus', 'DMM', true),
    ('a3333333-3333-3333-3333-333333333333', 'Kenya Bus Service', 'KBS', true),
    ('a4444444-4444-4444-4444-444444444444', 'Nairobi Matatu Union', 'NMU', false)
ON CONFLICT (name) DO NOTHING;

-- Insert sample traffic nodes
INSERT INTO traffic_nodes (id, name, geom, node_type, passenger_throughput, average_dwell_time, saturation_level) VALUES
    ('b1111111-1111-1111-1111-111111111111', 'Kenya Bus Terminal (CBD)', ST_SetSRID(ST_MakePoint(36.8224, -1.2868), 4326), 'terminus', 15000, 180, 0.85),
    ('b2222222-2222-2222-2222-222222222222', 'Kenyatta Avenue Station', ST_SetSRID(ST_MakePoint(36.7928, -1.3017), 4326), 'interchange', 12000, 120, 0.72),
    ('b3333333-3333-3333-3333-333333333333', 'Kasarani Stadium', ST_SetSRID(ST_MakePoint(36.8335, -1.3176), 4326), 'terminus', 8000, 240, 0.65),
    ('b4444444-4444-4444-4444-444444444444', 'Imara Daima Station', ST_SetSRID(ST_MakePoint(36.8683, -1.1843), 4326), 'interchange', 6000, 90, 0.45),
    ('b5555555-5555-5555-5555-555555555555', 'Westlands Terminal', ST_SetSRID(ST_MakePoint(36.8034, -1.2692), 4326), 'terminus', 10000, 150, 0.78),
    ('b6666666-6666-6666-6666-666666666666', 'Park Road Station', ST_SetSRID(ST_MakePoint(36.8394, -1.2669), 4326), 'staging_point', 4000, 60, 0.35)
ON CONFLICT (id) DO NOTHING;

-- Insert sample vehicles
INSERT INTO vehicles (sacco_id, plate_number, capacity, position, heading, speed, status) VALUES
    ('a1111111-1111-1111-1111-111111111111', 'KBZ 123A', 14, ST_SetSRID(ST_MakePoint(36.8150, -1.2900), 4326), 45, 35, 'active'),
    ('a1111111-1111-1111-1111-111111111111', 'KBZ 456B', 14, ST_SetSRID(ST_MakePoint(36.8200, -1.2850), 4326), 90, 20, 'active'),
    ('a2222222-2222-2222-2222-222222222222', 'KDJ 789C', 14, ST_SetSRID(ST_MakePoint(36.8300, -1.3100), 4326), 180, 45, 'active'),
    ('a3333333-3333-3333-3333-333333333333', 'KBR 101D', 25, ST_SetSRID(ST_MakePoint(36.7950, -1.3000), 4326), 270, 30, 'active'),
    ('a4444444-4444-4444-4444-444444444444', 'KAQ 202E', 14, ST_SetSRID(ST_MakePoint(36.8650, -1.1900), 4326), 315, 40, 'active')
ON CONFLICT (plate_number) DO NOTHING;

-- ============================================
-- Permissions
-- ============================================

-- Grant permissions (adjust role name as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- ============================================
-- Done
-- ============================================

SELECT 'PostGIS initialization complete!' AS status;
SELECT PostGIS_Version() AS postgis_version;
