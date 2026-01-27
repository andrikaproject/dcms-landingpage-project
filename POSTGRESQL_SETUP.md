# PostgreSQL Setup Documentation

## ✅ Installation Complete

PostgreSQL client (libpq) has been successfully installed and configured on your Mac.

## 📦 What Was Installed

- **Package**: libpq 18.1 (PostgreSQL client tools)
- **Installation Method**: Homebrew
- **Location**: `/opt/homebrew/opt/libpq/`
- **Tools Available**: psql, pg_dump, pg_restore, and more

## 🔧 Configuration

### 1. PATH Setup
Added to `~/.zshrc`:
```bash
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
```

### 2. Aliases
Created convenient aliases in `~/.zshrc`:
```bash
# PostgreSQL aliases
alias psql='/opt/homebrew/opt/libpq/bin/psql'
alias pg_dump='/opt/homebrew/opt/libpq/bin/pg_dump'
alias pg_restore='/opt/homebrew/opt/libpq/bin/pg_restore'

# Quick connect to CasaOS PostgreSQL
alias pgcasa='PGPASSWORD=casaos /opt/homebrew/opt/libpq/bin/psql -h 192.168.0.103 -p 5432 -U casaos -d postgres'
```

### 3. Password File
Created `~/.pgpass` for automatic authentication:
```
192.168.0.103:5432:*:casaos:casaos
```
- File permissions set to `600` (secure)
- No need to type password anymore!

## 🎯 Server Connection Details

- **Host**: 192.168.0.103
- **Port**: 5432
- **Username**: casaos
- **Password**: casaos
- **Default Database**: postgres

## 🚀 How to Use

### Quick Connect (Recommended)
After opening a new terminal or running `source ~/.zshrc`:
```bash
pgcasa
```

### Manual Connect
```bash
psql -h 192.168.0.103 -p 5432 -U casaos -d postgres
```

### List Databases
```bash
psql -h 192.168.0.103 -p 5432 -U casaos -d postgres -c "\l"
```

### Run SQL Query
```bash
psql -h 192.168.0.103 -p 5432 -U casaos -d postgres -c "SELECT * FROM your_table;"
```

### Connect to Specific Database
```bash
psql -h 192.168.0.103 -p 5432 -U casaos -d your_database_name
```

## 📊 Available Databases

Currently on your server:
- `casaos` - Main database
- `postgres` - Default PostgreSQL database
- `template0` - Template database
- `template1` - Template database

## 💡 Common Commands

Once connected to psql:
```sql
\l              -- List all databases
\c dbname       -- Connect to database
\dt             -- List all tables
\d tablename    -- Describe table structure
\du             -- List all users
\q              -- Quit psql
```

## 🔄 Reload Configuration

After making changes to `.zshrc`, reload it:
```bash
source ~/.zshrc
```

## ✅ Verification

Connection tested successfully:
```
PostgreSQL 17.4 (Debian 17.4-1.pgdg120+2) on x86_64-pc-linux-gnu
```

## 🛠️ Troubleshooting

### If psql command not found:
```bash
source ~/.zshrc
# or use full path:
/opt/homebrew/opt/libpq/bin/psql --version
```

### If connection fails:
1. Check if PostgreSQL server is running
2. Verify network connectivity: `ping 192.168.0.103`
3. Check firewall settings on server
4. Verify credentials

### Update libpq:
```bash
brew upgrade libpq
```

## 📝 Notes

- libpq is "keg-only" - not symlinked to avoid conflicts with full PostgreSQL installation
- Password stored in `.pgpass` is secure (600 permissions)
- All PostgreSQL client tools are now available in your PATH
