import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function JoinPage() {
  const { token } = useParams();
  const { user, addToast } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    api.post(`/forums/join/${token}`)
      .then(({ forum_id, title }) => {
        addToast(`Bergabung ke forum "${title}"`, 'success');
        navigate(`/${user.role}/chat`, { state: { forumId: forum_id }, replace: true });
      })
      .catch(err => {
        addToast(err.message, 'error');
        navigate(`/${user.role}/forum`, { replace: true });
      });
  }, [user, token]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ textAlign: 'center', color: '#6B7280', fontSize: 14 }}>
        <div style={{ marginBottom: 8 }}>Bergabung ke forum...</div>
      </div>
    </div>
  );
}
