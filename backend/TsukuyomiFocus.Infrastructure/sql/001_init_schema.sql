-- Tsukuyomi Focus - PostgreSQL Initial Schema

-- 1. Perfil do Usuário / Estado Ocular e Gamificação
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) NOT NULL DEFAULT 'Uchiha',
    total_chakra INT NOT NULL DEFAULT 0,
    total_focus_minutes INT NOT NULL DEFAULT 0,
    current_eye_stage VARCHAR(30) NOT NULL DEFAULT 'normal', -- normal, tomoe_1, tomoe_2, tomoe_3, mangekyou, ems, rinnegan
    equipped_eye_stage VARCHAR(30) NOT NULL DEFAULT 'normal',
    mangekyou_variant VARCHAR(30) NOT NULL DEFAULT 'itachi', -- itachi, sasuke, shisui, obito, madara
    custom_eye_image_url TEXT NULL,
    visual_blur_level INT NOT NULL DEFAULT 0 CHECK (visual_blur_level BETWEEN 0 AND 3),
    current_streak INT NOT NULL DEFAULT 0,
    best_streak INT NOT NULL DEFAULT 0,
    last_focus_date DATE NULL,
    -- Estado do Izanagi
    left_eye_blind BOOLEAN NOT NULL DEFAULT FALSE,
    right_eye_blind BOOLEAN NOT NULL DEFAULT FALSE,
    restoration_required_minutes INT NOT NULL DEFAULT 180,
    restoration_progress_minutes INT NOT NULL DEFAULT 0,
    last_izanagi_date DATE NULL,
    total_izanagi_used INT NOT NULL DEFAULT 0,
    last_amaterasu_check_date DATE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Missões do Kanban
CREATE TABLE IF NOT EXISTS missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    rank VARCHAR(2) NOT NULL CHECK (rank IN ('D', 'C', 'B', 'A', 'S')),
    status VARCHAR(20) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_tsukuyomi', 'completed')),
    estimated_minutes INT NOT NULL DEFAULT 25,
    completed_minutes INT NOT NULL DEFAULT 0,
    completed_cycles INT NOT NULL DEFAULT 0,
    is_amaterasu BOOLEAN NOT NULL DEFAULT FALSE,
    amaterasu_date DATE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL
);

-- 3. Histórico de Sessões de Foco (Tsukuyomi Logs & Heatmap)
CREATE TABLE IF NOT EXISTS focus_session_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    mission_id UUID NULL REFERENCES missions(id) ON DELETE SET NULL,
    mission_title VARCHAR(200) NULL,
    rank VARCHAR(2) NULL,
    duration_minutes INT NOT NULL,
    chakra_earned INT NOT NULL DEFAULT 0,
    was_susanoo_active BOOLEAN NOT NULL DEFAULT FALSE,
    was_completed BOOLEAN NOT NULL DEFAULT TRUE,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_missions_user_status ON missions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_focus_logs_user_date ON focus_session_logs(user_id, session_date);
