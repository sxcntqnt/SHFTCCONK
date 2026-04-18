-- ============================================
-- DuckDB Schema - Nairobi Transit Intelligence Platform
-- ============================================

-- Load extensions
INSTALL spatial;
LOAD spatial;
INSTALL h3;
LOAD h3;

-- ============================================
-- Tables
-- ============================================

CREATE TABLE IF NOT EXISTS traffic_nodes (
    id UUID PRIMARY KEY DEFAULT uuid(),
    name VARCHAR NOT NULL,
    geom GEOMETRY NOT NULL,
    node_type VARCHAR NOT NULL CHECK (node_type IN ('terminus', 'interchange', 'staging_point')),
    passenger_throughput INTEGER DEFAULT 0,
    average_dwell_time INTEGER DEFAULT 0,
    peak_hour TIME DEFAULT '08:00:00',
    saturation_level DECIMAL(3,2) DEFAULT 0 CHECK (saturation_level BETWEEN 0 AND 1),
    connected_routes UUID[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS corridor_analytics (
    id UUID PRIMARY KEY DEFAULT uuid(),
    name VARCHAR NOT NULL,
    start_node UUID,
    end_node UUID,
    geom GEOMETRY NOT NULL,
    fuel_burn_rate DECIMAL(6,2) DEFAULT 0,
    idling_hotspot_score DECIMAL(5,2) DEFAULT 0,
    vehicle_stress_index DECIMAL(5,2) DEFAULT 0,
    average_speed DECIMAL(5,2) DEFAULT 0,
    peak_flow_time TIME DEFAULT '08:30:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid(),
    sacco_id UUID NOT NULL,
    plate_number VARCHAR UNIQUE NOT NULL,
    capacity INTEGER DEFAULT 14,
    position GEOMETRY NOT NULL,
    heading DECIMAL(5,2) DEFAULT 0,
    speed DECIMAL(5,2) DEFAULT 0,
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'idle', 'maintenance', 'reserved')),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saccos (
    id UUID PRIMARY KEY DEFAULT uuid(),
    name VARCHAR UNIQUE NOT NULL,
    code VARCHAR UNIQUE,
    contact_phone VARCHAR,
    contact_email VARCHAR,
    vehicle_count INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS h3_cells (
    h3_cell_id VARCHAR PRIMARY KEY,
    resolution INTEGER NOT NULL,
    h3_boundary GEOMETRY NOT NULL,
    h3_center GEOMETRY NOT NULL,
    properties JSON DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT uuid(),
    organization_id UUID NOT NULL,
    organization_name VARCHAR NOT NULL,
    route_id UUID,
    vehicle_id UUID,
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP NOT NULL,
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    passenger_count INTEGER DEFAULT 0,
    pickup_point GEOMETRY NOT NULL,
    dropoff_point GEOMETRY NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spatial Indexes (DuckDB uses RTREE for geometry)
CREATE INDEX IF NOT EXISTS idx_traffic_nodes_geom ON traffic_nodes USING RTREE(geom);
CREATE INDEX IF NOT EXISTS idx_vehicles_position ON vehicles USING RTREE(position);
CREATE INDEX IF NOT EXISTS idx_corridors_geom ON corridor_analytics USING RTREE(geom);
CREATE INDEX IF NOT EXISTS idx_h3_cells_geom ON h3_cells USING RTREE(h3_boundary);

-- ============================================
-- Seed Data (Nairobi)
-- ============================================

INSERT OR IGNORE INTO saccos (id, name, code, verified) VALUES
    ('a1111111-1111-1111-1111-111111111111', 'Nyama Choma Express', 'NCE', true),
    ('a2222222-2222-2222-2222-222222222222', 'Double M Matatus', 'DMM', true),
    ('a3333333-3333-3333-3333-333333333333', 'Kenya Bus Service', 'KBS', true);

INSERT OR IGNORE INTO traffic_nodes (id, name, geom, node_type, passenger_throughput, average_dwell_time, saturation_level) VALUES
    ('b1111111-1111-1111-1111-111111111111', 'Kenya Bus Terminal (CBD)', ST_Point(36.8224, -1.2868), 'terminus', 15000, 180, 0.85),
    ('b2222222-2222-2222-2222-222222222222', 'Kenyatta Avenue Station', ST_Point(36.7928, -1.3017), 'interchange', 12000, 120, 0.72),
    ('b3333333-3333-3333-3333-333333333333', 'Kasarani Stadium', ST_Point(36.8335, -1.3176), 'terminus', 8000, 240, 0.65);

-- Add more seed data as needed...