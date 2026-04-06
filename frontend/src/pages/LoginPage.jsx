import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(form.email, form.password);
    if (result.success) {
      const redirect = searchParams.get('redirect');
      if (redirect) {
        navigate(redirect, { replace: true });
      } else if (result.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (result.role === 'karyawan') {
        navigate('/karyawan/dashboard');
      } else {
        navigate('/client/dashboard');
      }
    }
    setLoading(false);
  };

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        .auth-page {
          min-height: 100vh;
          display: flex;
          font-family: 'Poppins', 'Segoe UI', sans-serif;
          background: #f5f5f5;
        }

        .auth-left {
          flex: 1.55;
          background: linear-gradient(180deg, #1783ee 0%, #0a2ea5 100%);
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
        }

        .auth-left::before,
        .auth-left::after {
          content: "";
          position: absolute;
          border: 1.5px solid rgba(79, 177, 255, 0.55);
          border-radius: 50%;
          left: -180px;
          bottom: -180px;
        }

        .auth-left::before {
          width: 520px;
          height: 520px;
        }

        .auth-left::after {
          width: 700px;
          height: 700px;
          left: -280px;
          bottom: -290px;
        }

        .auth-brand {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 460px;
          color: white;
          text-align: left;
        }

        .auth-brand h1 {
          margin: 0 0 12px;
          font-size: 58px;
          font-weight: 700;
          letter-spacing: -1px;
        }

        .auth-brand p {
          margin: 0 0 28px;
          font-size: 22px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.92);
        }

        .brand-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 54px;
          min-width: 150px;
          padding: 0 28px;
          border: none;
          border-radius: 999px;
          background: linear-gradient(135deg, #1d8fff, #0f6fe8);
          color: white;
          font-size: 20px;
          font-weight: 500;
          cursor: pointer;
        }

        .auth-right {
          flex: 1;
          background: #f7f7f7;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
        }

        .auth-form-wrap {
          width: 100%;
          max-width: 420px;
        }

        .auth-title {
          margin: 0;
          font-size: 38px;
          font-weight: 700;
          color: #2f2f2f;
        }

        .auth-subtitle {
          margin: 8px 0 38px;
          font-size: 20px;
          color: #444;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .field-wrap {
          position: relative;
        }

        .field-icon {
          position: absolute;
          top: 50%;
          left: 24px;
          transform: translateY(-50%);
          color: #b8b8b8;
        }

        .field-input {
          width: 100%;
          height: 50px;
          border: 1.5px solid #ececec;
          background: transparent;
          border-radius: 999px;
          outline: none;
          padding: 0 58px 0 64px;
          font-size: 15px;
          color: #2f2f2f;
          transition: 0.2s ease;
        }

        .field-input::placeholder {
          color: #c4c4c4;
        }

        .field-input:focus {
          border-color: #1783ee;
          background: #fff;
        }

        .pass-toggle {
          position: absolute;
          top: 50%;
          right: 22px;
          transform: translateY(-50%);
          border: none;
          background: transparent;
          color: #b8b8b8;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .submit-btn {
          width: 100%;
          height: 50px;
          border: none;
          border-radius: 999px;
          background: #1783ee;
          color: white;
          font-size: 20px;
          font-weight: 500;
          cursor: pointer;
          margin-top: 8px;
          transition: 0.2s ease;
        }

        .submit-btn:hover {
          opacity: 0.95;
        }

        .submit-btn:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .forgot-link {
          margin-top: 18px;
          text-align: center;
          color: #666;
          text-decoration: none;
          font-size: 16px;
          display: block;
        }

        .switch-auth {
          margin-top: 22px;
          text-align: center;
          font-size: 15px;
          color: #666;
        }

        .switch-auth a {
          color: #1783ee;
          text-decoration: none;
          font-weight: 600;
        }

        @media (max-width: 1024px) {
          .auth-brand h1 {
            font-size: 46px;
          }

          .auth-brand p {
            font-size: 18px;
          }

          .auth-title {
            font-size: 32px;
          }
        }

        @media (max-width: 768px) {
          .auth-page {
            flex-direction: column;
          }

          .auth-left {
            min-height: 280px;
            flex: unset;
          }

          .auth-brand {
            text-align: center;
          }

          .auth-brand h1 {
            font-size: 40px;
          }

          .auth-brand p {
            font-size: 16px;
          }

          .auth-right {
            padding: 32px 20px 40px;
          }

          .auth-title {
            font-size: 28px;
          }

          .auth-subtitle {
            font-size: 16px;
            margin-bottom: 28px;
          }

          .field-input,
          .submit-btn {
            height: 58px;
            font-size: 16px;
          }
        }
      `}</style>

      <div className="auth-page">
        <div className="auth-left">
          <div className="auth-brand">
            <h1>WebcareChat</h1>
            <p>Platform komunikasi client, user, dan karyawan dalam satu group chat</p>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-wrap">
            <h2 className="auth-title">Hello Again!</h2>
            <p className="auth-subtitle">Welcome Back</p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="field-wrap">
                <Mail size={22} className="field-icon" />
                <input
                  className="field-input"
                  type="email"
                  required
                  placeholder="Email Address"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="field-wrap">
                <Lock size={22} className="field-icon" />
                <input
                  className="field-input"
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  className="pass-toggle"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Loading...' : 'Login'}
              </button>
            </form>

            <Link to="#" className="forgot-link">
              Forgot Password
            </Link>

            <div className="switch-auth">
              Belum punya akun? <Link to="/register">Register</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}