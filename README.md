# Invoice Generator

A modern, professional invoice generator with Google authentication and cloud storage powered by Supabase.

![Invoice Generator](https://img.shields.io/badge/Built%20with-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

## ✨ Features

- 🔐 **Google Authentication** - Secure login with Google OAuth
- ☁️ **Cloud Storage** - Save and access invoices from anywhere
- 💰 **Multi-Currency Support** - INR, USD, EUR, GBP, JPY, AUD, CAD
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🎨 **Modern UI** - Glassmorphism effects and smooth animations
- 📄 **PDF Export** - Print or save invoices as PDF
- ✍️ **Signature Upload** - Add your signature or company stamp
- 🔒 **Secure** - Row Level Security ensures data privacy
- 🚀 **Real-time Preview** - See changes instantly

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ installed
- A Supabase account
- Google Cloud Console project with OAuth credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd invoice-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Supabase**
   - Update `supabase.js` with your Supabase URL and anon key
   - Run the SQL schema in your Supabase SQL Editor (see `schema.sql`)

4. **Configure Google OAuth**
   - Set up OAuth credentials in Google Cloud Console
   - Add credentials to Supabase Authentication → Providers → Google
   - Add redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   - Navigate to `http://localhost:5173`

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Build Tool**: Vite
- **Authentication**: Supabase Auth with Google OAuth
- **Database**: PostgreSQL (via Supabase)
- **Styling**: Custom CSS with glassmorphism effects

## 📝 Usage

1. **Sign in** with your Google account
2. **Fill in** business and client information
3. **Add line items** with descriptions, quantities, and rates
4. **Upload signature** (optional)
5. **Save invoice** to cloud storage
6. **Print or download** as PDF

## 🔐 Security

- Row Level Security (RLS) ensures users only access their own data
- Google OAuth for secure authentication
- No sensitive data stored in localStorage
- All data encrypted in transit and at rest

## 📦 Project Structure

```
invoice-generator/
├── index.html          # Main invoice generator page
├── login.html          # Login page
├── style.css           # Styles with glassmorphism effects
├── main.js             # Main application logic
├── login.js            # Login functionality
├── supabase.js         # Supabase configuration
├── schema.sql          # Database schema
└── package.json        # Dependencies
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with [Vite](https://vitejs.dev/)
- Powered by [Supabase](https://supabase.com/)
- Authentication via [Google OAuth](https://developers.google.com/identity/protocols/oauth2)

---

Made with ❤️ for creating professional invoices
