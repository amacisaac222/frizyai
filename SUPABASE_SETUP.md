# Frizy Supabase Setup Guide

## Quick Setup Steps

### 1. Get Your Anon Key
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `wsjtvonzbpzzamuqjtdy`
3. Go to **Settings** → **API**
4. Copy the **anon public** key
5. Update your `.env` file:
   ```env
   VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
   ```

### 2. Run Database Migration
1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the contents of `database/setup.sql` 
4. Paste into the SQL editor
5. Click **Run** to execute

### 3. Test Authentication
- The app will work in demo mode with `demo@frizy.ai` / `demo`
- Once database is set up, you can create real accounts via the signup form

## Database Schema Overview

The migration creates these tables:
- `users` - User profiles (extends Supabase auth)
- `projects` - Project management
- `blocks` - Work items in swim lanes
- `events` - Event sourcing for audit trails
- `claude_sessions` - AI interaction tracking
- `block_relationships` - Dependencies and relationships
- `collaboration_sessions` - Real-time collaboration

## Security Features
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Automatic profile creation on signup
- Secure authentication via Supabase Auth

## Development vs Production
- **Demo Mode**: Uses mock data, no database required
- **Production Mode**: Full Supabase integration with real data persistence
