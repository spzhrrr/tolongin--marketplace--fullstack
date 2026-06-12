// generate.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = __dirname;

//       ====== STRUKTUR FOLDER       ======
const folders = [
  "src/app",
  "src/features/auth/pages",
  "src/features/admin",
  "src/features/chat",
  "src/features/dashboard",
  "src/features/home",
  "src/features/jobs",
  "src/features/marketplace",
  "src/features/orders",
  "src/features/profile",
  "src/shared/ui",
  "src/shared/utils",
  "src/styles",
];

//       ====== TEMPLATE FILES       ======

// src/app/App.js
const appJs = `import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './store';
import { Router } from './router';
import '../styles/main.css';

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Router />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
`;

// src/app/layout.js
const layoutJs = `import React from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

export const Layout = () => {
  const { user } = useSelector((state) => state.auth);
  
  return (
    <div className="app-layout">
      <header className="header">
        <nav>
          <a href="/">Home</a>
          <a href="/marketplace">Marketplace</a>
          <a href="/jobs">Jobs</a>
          {user ? (
            <>
              <a href="/dashboard">Dashboard</a>
              <a href="/profile">Profile</a>
              <button>Logout</button>
            </>
          ) : (
            <a href="/auth/login">Login</a>
          )}
        </nav>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="footer">
        <p>Tolongin Marketplace © 2026</p>
      </footer>
    </div>
  );
};

export default Layout;
`;

// src/app/router.js
const routerJs = `import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './layout';
import { HomePage } from '../features/home/HomePage';
import { AuthPages } from '../features/auth/pages/AuthPages';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { DashboardPages } from '../features/dashboard/DashboardPages';
import { MarketplacePages } from '../features/marketplace/MarketplacePages';
import { JobsPages } from '../features/jobs/JobsPages';
import { OrdersPages } from '../features/orders/OrdersPages';
import { ProfilePages } from '../features/profile/ProfilePages';
import { AdminPages } from '../features/admin/AdminPages';
import { ChatPages } from '../features/chat/ChatPages';
import { KycPage } from '../features/profile/KycPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'marketplace', element: <MarketplacePages /> },
      { path: 'jobs', element: <JobsPages /> },
      { path: 'dashboard', element: <DashboardPages /> },
      { path: 'orders', element: <OrdersPages /> },
      { path: 'profile', element: <ProfilePages /> },
      { path: 'profile/kyc', element: <KycPage /> },
      { path: 'admin', element: <AdminPages /> },
      { path: 'chat', element: <ChatPages /> },
      { path: 'auth', element: <AuthPages /> },
      { path: 'auth/login', element: <LoginPage /> },
    ],
  },
]);

export const Router = () => <RouterProvider router={router} />;
`;

// src/app/store.js
const storeJs = `import { configureStore } from '@reduxjs/toolkit';

// Slice reducers (akan diisi nanti)
const authReducer = (state = { user: null, token: null }, action) => {
  switch (action.type) {
    case 'auth/setUser':
      return { ...state, user: action.payload };
    case 'auth/setToken':
      return { ...state, token: action.payload };
    default:
      return state;
  }
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});
`;

// src/features/auth/pages/AuthPages.js
const authPagesJs = `import React, { useState } from 'react';
import api from '../../../shared/utils/api';

export const AuthPages = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const res = await api.post(endpoint, formData);
      if (isLogin) {
        localStorage.setItem('token', res.data.access_token);
        window.location.href = '/dashboard';
      } else {
        setIsLogin(true);
        alert('Registration successful! Please login.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  return (
    <div className="auth-container">
      <h2>{isLogin ? 'Login' : 'Register'}</h2>
      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
        <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
      </form>
      <button onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
      </button>
    </div>
  );
};
`;

// src/features/auth/pages/LoginPage.js
const loginPageJs = `import React from 'react';
import { AuthPages } from './AuthPages';

export const LoginPage = () => {
  return <AuthPages />;
};
`;

// src/features/home/HomePage.js
const homePageJs = `import React, { useEffect, useState } from 'react';
import api from '../../shared/utils/api';

export const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [featuredServices, setFeaturedServices] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cats, services] = await Promise.all([
          api.get('/categories'),
          api.get('/services?featured=true'),
        ]);
        setCategories(cats.data);
        setFeaturedServices(services.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="home-page">
      <section className="hero">
        <h1>Tolongin Marketplace</h1>
        <p>Find the best freelancers and services in Indonesia</p>
      </section>
      
      <section className="categories">
        <h2>Popular Categories</h2>
        <div className="category-grid">
          {categories.map((cat) => (
            <div key={cat.id} className="category-card">
              {cat.icon} {cat.name}
            </div>
          ))}
        </div>
      </section>

      <section className="featured">
        <h2>Featured Services</h2>
        <div className="service-grid">
          {featuredServices.map((service) => (
            <div key={service.id} className="service-card">
              <h3>{service.title}</h3>
              <p>Rp {service.price?.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
`;

// src/features/marketplace/MarketplacePages.js
const marketplacePagesJs = `import React, { useState, useEffect } from 'react';
import api from '../../shared/utils/api';

export const MarketplacePages = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await api.get('/services');
        setServices(res.data?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="marketplace-page">
      <h1>Service Marketplace</h1>
      <div className="services-grid">
        {services.map((service) => (
          <div key={service.id} className="service-card">
            <h3>{service.title}</h3>
            <p className="price">Rp {service.price?.toLocaleString()}</p>
            <p className="delivery">Delivery: {service.deliveryTime} days</p>
            <button>View Details</button>
          </div>
        ))}
      </div>
    </div>
  );
};
`;

// src/features/jobs/JobsPages.js
const jobsPagesJs = `import React, { useState, useEffect } from 'react';
import api from '../../shared/utils/api';

export const JobsPages = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await api.get('/jobs');
        setJobs(res.data?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="jobs-page">
      <h1>Jobs Board</h1>
      <div className="jobs-list">
        {jobs.map((job) => (
          <div key={job.id} className="job-card">
            <h3>{job.title}</h3>
            <p className="budget">Budget: Rp {job.budget?.toLocaleString()}</p>
            <button>Apply Now</button>
          </div>
        ))}
      </div>
    </div>
  );
};
`;

// src/features/orders/OrdersPages.js
const ordersPagesJs = `import React, { useState, useEffect } from 'react';
import api from '../../shared/utils/api';

export const OrdersPages = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/orders');
        setOrders(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="orders-page">
      <h1>My Orders</h1>
      <div className="orders-list">
        {orders.map((order) => (
          <div key={order.id} className="order-card">
            <p>Order #{order.id}</p>
            <p>Status: {order.status}</p>
            <p>Total: Rp {order.totalAmount?.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
`;

// src/features/profile/ProfilePages.js
const profilePagesJs = `import React, { useEffect, useState } from 'react';
import api from '../../shared/utils/api';

export const ProfilePages = () => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/users/me');
        setProfile(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProfile();
  }, []);

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="profile-page">
      <h1>My Profile</h1>
      <div className="profile-info">
        <p><strong>Name:</strong> {profile.name}</p>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Role:</strong> {profile.role}</p>
        <p><strong>Phone:</strong> {profile.phone || '-'}</p>
      </div>
    </div>
  );
};
`;

// src/features/profile/KycPage.js
const kycPageJs = `import React, { useState } from 'react';
import api from '../../shared/utils/api';

export const KycPage = () => {
  const [formData, setFormData] = useState({
    idNumber: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users/kyc', formData);
      alert('KYC submitted successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error submitting KYC');
    }
  };

  return (
    <div className="kyc-page">
      <h1>KYC Verification</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="ID Number (KTP)"
          value={formData.idNumber}
          onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Bank Name"
          value={formData.bankName}
          onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Account Number"
          value={formData.accountNumber}
          onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Account Name"
          value={formData.accountName}
          onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
          required
        />
        <button type="submit">Submit KYC</button>
      </form>
    </div>
  );
};
`;

// src/features/admin/AdminPages.js
const adminPagesJs = `import React, { useEffect, useState } from 'react';
import api from '../../shared/utils/api';

export const AdminPages = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [usersRes, statsRes] = await Promise.all([
          api.get('/admin/users'),
          api.get('/admin/dashboard/stats'),
        ]);
        setUsers(usersRes.data);
        setStats(statsRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAdminData();
  }, []);

  const handleSuspend = async (userId) => {
    try {
      await api.post(\`/admin/users/\${userId}/suspend\`);
      alert('User suspended');
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">Total Users: {stats.totalUsers}</div>
        <div className="stat-card">Total Orders: {stats.totalOrders}</div>
        <div className="stat-card">Total Revenue: Rp {stats.totalRevenue?.toLocaleString()}</div>
      </div>
      <h2>Users</h2>
      <table className="users-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.name}</td>
              <td>{user.role}</td>
              <td>{user.isActive ? 'Active' : 'Suspended'}</td>
              <td>
                {user.isActive ? (
                  <button onClick={() => handleSuspend(user.id)}>Suspend</button>
                ) : (
                  <button>Activate</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
`;

// src/features/chat/ChatPages.js
const chatPagesJs = `import React, { useState, useEffect } from 'react';
import api from '../../shared/utils/api';

export const ChatPages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await api.get('/chat/conversations');
        setConversations(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchConversations();
  }, []);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await api.post(\`/chat/conversations/\${selectedConversation.id}/messages\`, {
        content: newMessage,
      });
      setNewMessage('');
      // Refresh messages
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="chat-page">
      <div className="conversations-list">
        {conversations.map((conv) => (
          <div key={conv.id} onClick={() => setSelectedConversation(conv)}>
            Conversation #{conv.id}
          </div>
        ))}
      </div>
      <div className="chat-window">
        {selectedConversation ? (
          <>
            <div className="messages">
              {messages.map((msg) => (
                <div key={msg.id}>{msg.content}</div>
              ))}
            </div>
            <div className="message-input">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        ) : (
          <div>Select a conversation</div>
        )}
      </div>
    </div>
  );
};
`;

// src/features/dashboard/DashboardPages.js
const dashboardPagesJs = `import React from 'react';
import { useSelector } from 'react-redux';

export const DashboardPages = () => {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="dashboard-page">
      <h1>Dashboard</h1>
      <p>Welcome back, {user?.name}!</p>
      <div className="dashboard-stats">
        <div className="stat-card">Active Orders: 0</div>
        <div className="stat-card">Completed Orders: 0</div>
        <div className="stat-card">Total Spent: Rp 0</div>
      </div>
    </div>
  );
};
`;

// src/shared/ui/components.js
const componentsJs = `import React from 'react';

export const Button = ({ children, onClick, variant = 'primary', ...props }) => {
  return (
    <button className={\`btn btn-\${variant}\`} onClick={onClick} {...props}>
      {children}
    </button>
  );
};

export const Card = ({ children, title }) => {
  return (
    <div className="card">
      {title && <div className="card-title">{title}</div>}
      <div className="card-content">{children}</div>
    </div>
  );
};

export const LoadingSpinner = () => {
  return <div className="spinner">Loading...</div>;
};

export const Alert = ({ message, type = 'info' }) => {
  return <div className={\`alert alert-\${type}\`}>{message}</div>;
};
`;

// src/shared/utils/api.js
const apiJs = `import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
});

// Request interceptor untuk menambahkan token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = \`Bearer \${token}\`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor untuk handle error
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export default api;
`;

// src/shared/utils/helpers.js
const helpersJs = `export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const getInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
`;

// src/shared/utils/i18n.js
const i18nJs = `// Simple i18n implementation
const translations = {
  id: {
    welcome: 'Selamat Datang',
    login: 'Masuk',
    register: 'Daftar',
    logout: 'Keluar',
    profile: 'Profil',
    dashboard: 'Dashboard',
    marketplace: 'Marketplace',
    jobs: 'Pekerjaan',
    orders: 'Pesanan',
    chat: 'Obrolan',
  },
  en: {
    welcome: 'Welcome',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    profile: 'Profile',
    dashboard: 'Dashboard',
    marketplace: 'Marketplace',
    jobs: 'Jobs',
    orders: 'Orders',
    chat: 'Chat',
  },
};

let currentLang = 'id';

export const t = (key) => {
  return translations[currentLang][key] || key;
};

export const setLanguage = (lang) => {
  if (translations[lang]) {
    currentLang = lang;
  }
};

export const getCurrentLang = () => currentLang;
`;

// src/shared/utils/upload-widget.js
const uploadWidgetJs = `export const openUploadWidget = (onSuccess, onError) => {
  // Implementasi upload widget (misal dengan Cloudinary atau upload sendiri)
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // Upload ke server
        const formData = new FormData();
        formData.append('file', file);
        
        // Panggil API upload
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        onSuccess(data.url);
      } catch (error) {
        onError(error);
      }
    }
  };
  input.click();
};
`;

// src/shared/utils/uploads.js
const uploadsJs = `import api from './api';

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.url;
};

export const uploadMultipleImages = async (files) => {
  const uploadPromises = files.map(file => uploadImage(file));
  return Promise.all(uploadPromises);
};
`;

// src/shared/utils/ws.js
const wsJs = `class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = {};
  }

  connect() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    this.socket = new WebSocket(\`ws://localhost:3001/chat?token=\${token}\`);
    
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const handlers = this.listeners[data.type] || [];
      handlers.forEach(handler => handler(data));
    };
    
    this.socket.onclose = () => {
      setTimeout(() => this.connect(), 3000);
    };
  }

  on(type, callback) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(callback);
  }

  send(type, payload) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const wsService = new WebSocketService();
`;

// src/styles/main.css
const mainCss = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f5f5f5;
  color: #333;
}

/* Layout */
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.header {
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 1rem 2rem;
}

.header nav {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.header nav a {
  text-decoration: none;
  color: #333;
}

.main-content {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.footer {
  background: #333;
  color: white;
  text-align: center;
  padding: 1rem;
}

/* Buttons */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.btn-primary {
  background: #4f46e5;
  color: white;
}

.btn-primary:hover {
  background: #4338ca;
}

/* Cards */
.service-card, .job-card, .order-card, .category-card {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.service-grid, .category-grid, .jobs-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

/* Forms */
form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 400px;
  margin: 0 auto;
}

input, textarea, select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

/* Admin */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.stat-card {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: white;
  padding: 1.5rem;
  border-radius: 10px;
  text-align: center;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.users-table th, .users-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.users-table th {
  background: #f9fafb;
}

/* Chat */
.chat-page {
  display: flex;
  height: 70vh;
  gap: 1rem;
}

.conversations-list {
  width: 30%;
  background: white;
  border-radius: 8px;
  overflow-y: auto;
}

.conversations-list > div {
  padding: 1rem;
  border-bottom: 1px solid #eee;
  cursor: pointer;
}

.chat-window {
  flex: 1;
  background: white;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.message-input {
  display: flex;
  padding: 1rem;
  border-top: 1px solid #eee;
}

.message-input input {
  flex: 1;
  margin-right: 0.5rem;
}

/* Responsive */
@media (max-width: 768px) {
  .main-content {
    padding: 1rem;
  }
  
  .service-grid, .category-grid, .jobs-list {
    grid-template-columns: 1fr;
  }
  
  .chat-page {
    flex-direction: column;
  }
  
  .conversations-list {
    width: 100%;
    height: 200px;
  }
}
`;

// src/main.js
const mainJs = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/main.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

//       ====== EKSEKUSI       ======
console.log("🚀 Starting folder structure generation...\n");

// 1. Buat folder
folders.forEach((folder) => {
  const fullPath = path.join(rootDir, folder);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created folder: ${folder}`);
  } else {
    console.log(`⚠️  Folder already exists: ${folder}`);
  }
});

// 2. Buat file
const files = [
  { path: "src/app/App.js", content: appJs },
  { path: "src/app/layout.js", content: layoutJs },
  { path: "src/app/router.js", content: routerJs },
  { path: "src/app/store.js", content: storeJs },
  { path: "src/features/auth/pages/AuthPages.js", content: authPagesJs },
  { path: "src/features/auth/pages/LoginPage.js", content: loginPageJs },
  { path: "src/features/home/HomePage.js", content: homePageJs },
  {
    path: "src/features/marketplace/MarketplacePages.js",
    content: marketplacePagesJs,
  },
  { path: "src/features/jobs/JobsPages.js", content: jobsPagesJs },
  { path: "src/features/orders/OrdersPages.js", content: ordersPagesJs },
  { path: "src/features/profile/ProfilePages.js", content: profilePagesJs },
  { path: "src/features/profile/KycPage.js", content: kycPageJs },
  { path: "src/features/admin/AdminPages.js", content: adminPagesJs },
  { path: "src/features/chat/ChatPages.js", content: chatPagesJs },
  {
    path: "src/features/dashboard/DashboardPages.js",
    content: dashboardPagesJs,
  },
  { path: "src/shared/ui/components.js", content: componentsJs },
  { path: "src/shared/utils/api.js", content: apiJs },
  { path: "src/shared/utils/helpers.js", content: helpersJs },
  { path: "src/shared/utils/i18n.js", content: i18nJs },
  { path: "src/shared/utils/upload-widget.js", content: uploadWidgetJs },
  { path: "src/shared/utils/uploads.js", content: uploadsJs },
  { path: "src/shared/utils/ws.js", content: wsJs },
  { path: "src/styles/main.css", content: mainCss },
  { path: "src/main.js", content: mainJs },
];

files.forEach((file) => {
  const fullPath = path.join(rootDir, file.path);
  fs.writeFileSync(fullPath, file.content, "utf8");
  console.log(`✅ Created file: ${file.path}`);
});

console.log("\n✨ Generation complete!");
console.log("\n📦 Next steps:");
console.log(
  "   1. npm install react-redux @reduxjs/toolkit axios react-router-dom",
);
console.log("   2. npm run dev");
console.log(
  "   3. Create .env file with: VITE_API_BASE_URL=http://localhost:3001/api",
);
