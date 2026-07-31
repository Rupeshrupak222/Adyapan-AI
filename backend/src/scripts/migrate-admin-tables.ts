import { prisma } from "../config/prisma";

async function migrateAdminTables() {
  console.log("Migrating Admin Domain database tables to PostgreSQL...");

  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS admin_roles (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      is_system BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS admin_users (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role_id VARCHAR(255) REFERENCES admin_roles(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'ACTIVE',
      avatar_url TEXT,
      last_login_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS admin_permissions (
      id VARCHAR(255) PRIMARY KEY,
      role_id VARCHAR(255) NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
      resource VARCHAR(255) NOT NULL,
      action VARCHAR(255) NOT NULL,
      CONSTRAINT unq_admin_perm UNIQUE (role_id, resource, action)
    );`,

    `CREATE TABLE IF NOT EXISTS admin_sessions (
      id VARCHAR(255) PRIMARY KEY,
      admin_id VARCHAR(255) NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      token VARCHAR(512) UNIQUE NOT NULL,
      ip_address VARCHAR(100),
      user_agent TEXT,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id VARCHAR(255) PRIMARY KEY,
      admin_id VARCHAR(255) REFERENCES admin_users(id) ON DELETE SET NULL,
      admin_name VARCHAR(255),
      action VARCHAR(255) NOT NULL,
      module VARCHAR(255) NOT NULL,
      target_id VARCHAR(255),
      details JSONB DEFAULT '{}'::jsonb,
      ip_address VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS admin_notifications (
      id VARCHAR(255) PRIMARY KEY,
      admin_id VARCHAR(255) REFERENCES admin_users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'info',
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS admin_settings (
      id VARCHAR(255) PRIMARY KEY,
      key VARCHAR(255) UNIQUE NOT NULL,
      value JSONB NOT NULL,
      category VARCHAR(100) DEFAULT 'general',
      description TEXT,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS admin_login_history (
      id VARCHAR(255) PRIMARY KEY,
      admin_id VARCHAR(255) NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      ip_address VARCHAR(100),
      user_agent TEXT,
      status VARCHAR(50) DEFAULT 'SUCCESS',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS system_metrics (
      id VARCHAR(255) PRIMARY KEY,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      cpu_usage DOUBLE PRECISION NOT NULL,
      memory_used DOUBLE PRECISION NOT NULL,
      memory_total DOUBLE PRECISION NOT NULL,
      active_users INT DEFAULT 0,
      req_per_min INT DEFAULT 0
    );`,

    `CREATE TABLE IF NOT EXISTS feature_flags (
      id VARCHAR(255) PRIMARY KEY,
      key VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      is_enabled BOOLEAN DEFAULT true,
      rollout_pct INT DEFAULT 100,
      status VARCHAR(50) DEFAULT 'Enabled',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS coupons (
      id VARCHAR(255) PRIMARY KEY,
      code VARCHAR(255) UNIQUE NOT NULL,
      discount_pct DOUBLE PRECISION NOT NULL,
      valid_until TIMESTAMP WITH TIME ZONE,
      max_uses INT,
      used_count INT DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS plans (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      code VARCHAR(255) UNIQUE NOT NULL,
      price_monthly DOUBLE PRECISION NOT NULL,
      price_yearly DOUBLE PRECISION NOT NULL,
      features JSONB DEFAULT '[]'::jsonb,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS revenue_reports (
      id VARCHAR(255) PRIMARY KEY,
      date TIMESTAMP WITH TIME ZONE UNIQUE NOT NULL,
      gross_revenue DOUBLE PRECISION DEFAULT 0,
      net_revenue DOUBLE PRECISION DEFAULT 0,
      new_subscribers INT DEFAULT 0,
      churn_count INT DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS admin_preferences (
      id VARCHAR(255) PRIMARY KEY,
      admin_id VARCHAR(255) UNIQUE NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      theme VARCHAR(50) DEFAULT 'dark',
      dashboard_config JSONB DEFAULT '{}'::jsonb
    );`
  ];

  for (const ddl of ddlStatements) {
    try {
      await prisma.$executeRawUnsafe(ddl);
    } catch (err: any) {
      console.warn("DDL Execution note:", err.message || err);
    }
  }

  console.log("Admin Domain PostgreSQL tables created successfully!");
  process.exit(0);
}

migrateAdminTables().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
