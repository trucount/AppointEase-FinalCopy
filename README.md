# AppointEase - Smart Appointment Booking System

A modern, responsive appointment booking system built with Next.js 14, featuring separate admin and user dashboards with real-time messaging and comprehensive appointment management.

## 🚀 Features

### 👨‍💼 Admin Dashboard
- **Dashboard Overview**: Real-time statistics and system monitoring
- **Appointment Management**: Approve, reject, and reschedule appointments
- **User Management**: View all users, their details, and appointment history
- **Messaging System**: Real-time chat with users
- **Settings**: Configure working hours, break times, and slot duration
- **Data Export**: Download all data in CSV format
- **Auto Cleanup**: Automatic deletion of old data (7+ days)

### 👤 User Dashboard
- **Home**: Personal appointment overview and statistics
- **Booking**: Smart slot selection with real-time availability
- **My Appointments**: Track all appointment statuses
- **Messaging**: Direct communication with admin
- **Settings**: Update profile information

### 🔧 Technical Features
- **Mobile-First Design**: Optimized for all devices
- **Real-time Updates**: Auto-refresh and live data sync
- **Smart Scheduling**: Automatic slot generation and conflict detection
- **Message Auto-cleanup**: Messages deleted 2 hours after being seen
- **Appointment Auto-completion**: Automatic status updates after time expires
- **Robust Error Handling**: Graceful handling of API failures
- **PWA Ready**: Progressive Web App capabilities

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Icons**: Lucide React
- **Database**: Pantry.cloud (Free cloud storage)
- **Deployment**: Vercel (recommended)

## 📦 Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd appointease
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Run the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   \`\`\`bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   \`\`\`

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Deploy with default settings

### Deploy to Netlify

1. **Build the project**
   \`\`\`bash
   npm run build
   \`\`\`

2. **Deploy to Netlify**
   - Drag and drop the `.next` folder to Netlify
   - Or connect your GitHub repository

## 🔑 Default Credentials

### Admin Access
- **Username**: Head
- **Password**: Testplay

### User Access
- Create a new account through the signup form
- No email required, just username, full name, phone, and password


## 🎯 Usage

### For Admins
1. Login with admin credentials
2. View dashboard statistics
3. Manage appointments (approve/reject/reschedule)
4. View and manage users
5. Set working hours and availability
6. Chat with users
7. Export data and manage cleanup

### For Users
1. Sign up for a new account
2. Book appointments by selecting date and time
3. Track appointment status
4. Chat with admin
5. Update profile information

## 🔧 Configuration

### Admin Settings
- **Working Hours**: Set start and end times
- **Break Time**: Configure break periods
- **Slot Duration**: Set appointment duration (15-240 minutes)

### Automatic Features
- **Appointment Completion**: Automatically marks appointments as completed after end time
- **Data Cleanup**: Removes appointment data older than 7 days
- **Message Cleanup**: Deletes messages 2 hours after being seen
- **Real-time Updates**: Auto-refresh every 30 seconds

## 📱 Mobile Support

The app is fully responsive and optimized for mobile devices:
- Touch-friendly interface
- Bottom navigation (WhatsApp-style)
- Optimized touch targets
- Mobile-first design approach

## 🔒 Security Features

- **Input Validation**: All user inputs are validated
- **XSS Protection**: Built-in Next.js security headers
- **Data Sanitization**: CSV export handles special characters
- **Session Management**: Secure local storage handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the documentation

## 🔄 Updates

The app automatically handles:
- Real-time data synchronization
- Appointment status updates
- Message cleanup
- Data validation

---

**AppointEase** - Making appointment booking simple and efficient! 🚀
