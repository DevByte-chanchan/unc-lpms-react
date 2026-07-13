

-- create schemas
CREATE DATABASE IF NOT EXISTS lpms_assignment CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS lpms_composition CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS lpms_submission CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS lpms_tos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS lpms_users CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- create per-schema users (dev only; use stronger secrets in prod)
CREATE USER IF NOT EXISTS 'assignment_user'@'%' IDENTIFIED BY 'assignment_dev';
CREATE USER IF NOT EXISTS 'composition_user'@'%' IDENTIFIED BY 'composition_dev';
CREATE USER IF NOT EXISTS 'submission_user'@'%' IDENTIFIED BY 'submission_dev';
CREATE USER IF NOT EXISTS 'tos_user'@'%' IDENTIFIED BY 'tos_dev';
CREATE USER IF NOT EXISTS 'users_admin'@'%' IDENTIFIED BY 'users_dev';


GRANT ALL PRIVILEGES ON lpms_assignment.* TO 'assignment_user'@'%';
GRANT ALL PRIVILEGES ON lpms_composition.* TO 'composition_user'@'%';
GRANT ALL PRIVILEGES ON lpms_submission.* TO 'submission_user'@'%';
GRANT ALL PRIVILEGES ON lpms_tos.* TO 'tos_user'@'%';
GRANT ALL PRIVILEGES ON lpms_users.* TO 'users_admin'@'%';


FLUSH PRIVILEGES;
