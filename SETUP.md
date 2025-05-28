# AppointEase Setup Guide

## 🚀 Quick Setup

### 1. Supabase Setup

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose your organization and create project

2. **Run Database Schema**
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `database/schema.sql`
   - Click "Run" to create all tables and policies

3. **Get Your Credentials**
   - Go to Settings → API
   - Copy your Project URL and anon public key

### 2. Environment Setup

1. **Create Environment File**
   \`\`\`bash
   cp .env.local.example .env.local
   \`\`\`

2. **Add Your Supabase Credentials**
   \`\`\`env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   \`\`\`

### 3. Install and Run

1. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Run Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`

3. **Open Your Browser**
   - Navigate to `http://localhost:3000`
   - You should see the AppointEase login page

## 🔐 Default Credentials

**Admin Login:**
- Username: `Head`
- Password: `Testplay`

**User Account:**
- Create new accounts via the "Sign Up" tab

## 📊 Features

✅ **User Authentication** - Secure login/signup  
✅ **Appointment Booking** - Smart time slot management  
✅ **Admin Dashboard** - Real-time statistics  
✅ **Messaging System** - Chat between users and admin  
✅ **Settings Management** - Configure working hours  
✅ **Real-time Updates** - Live data synchronization  
✅ **Mobile Responsive** - Works on all devices  

## 🛠️ Database Tables

- **users** - User accounts and authentication
- **appointments** - Appointment bookings and status
- **messages** - Chat messages between users and admin
- **admin_settings** - Working hours and configuration

## 🔧 Troubleshooting

**Common Issues:**

1. **Environment Variables Not Loading**
   - Make sure `.env.local` is in the root directory
   - Restart the development server after adding variables

2. **Database Connection Issues**
   - Verify your Supabase URL and key are correct
   - Check if RLS policies are properly set up

3. **Import Path Errors**
   - All Supabase imports should use relative paths: `../../lib/supabase`

## 📱 Usage

1. **Admin Functions:**
   - View dashboard statistics
   - Approve/reject appointments
   - Manage users
   - Configure working hours
   - Chat with users

2. **User Functions:**
   - Book appointments
   - View appointment status
   - Chat with admin
   - Update profile settings

## 🚀 Deployment

**Deploy to Vercel:**
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

Your AppointEase app is now ready to use! 🎉
