import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase';

export default function FindUsers({ currentUser }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) { navigate('/'); return; }
    loadUsers();
  }, [currentUser]);

  async function loadUsers() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const allUsers = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.id !== currentUser.uid);
      setUsers(allUsers);
      const me = snap.docs.find(d => d.id === currentUser.uid);
      setFollowing(me?.data()?.following || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
    setLoading(false);
  }

  async function handleFollow(userId) {
    try {
      const isFollowing = following.includes(userId);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        following: isFollowing ? arrayRemove(userId) : arrayUnion(userId)
      });
      await updateDoc(doc(db, 'users', userId), {
        followers: isFollowing ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
      });
      setFollowing(prev =>
        isFollowing ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    } catch (err) {
      console.error('Error following:', err);
    }
  }

  const filtered = users.filter(u =>
    (u.displayName || u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0d1117 100%)',
      color: '#e8e8e8',
      fontFamily: "'Crimson Pro', Georgia, serif",
      padding: '20px',
    },
    backBtn: {
      background: 'none',
      border: '1px solid #c9a84c',
      color: '#c9a84c',
      padding: '8px 16px',
      borderRadius: '20px',
      cursor: 'pointer',
      fontSize: '0.75rem',
      marginBottom: '24px',
    },
    title: {
      textAlign: 'center',
      fontFamily: "'Cinzel', serif",
      fontSize: '1.6rem',
      color: '#c9a84c',
      marginBottom: '24px',
    },
    searchBox: {
      display: 'block',
      margin: '0 auto 24px',
      width: '100%',
      maxWidth: '500px',
      padding: '10px 16px',
      borderRadius: '20px',
      border: '1px solid #c9a84c',
      background: 'rgba(255,255,255,0.05)',
      color: '#e8e8e8',
      fontSize: '1rem',
      boxSizing: 'border-box',
    },
    card: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(201,168,76,0.2)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      maxWidth: '500px',
      margin: '0 auto 12px',
      boxSizing: 'border-box',
    },
    avatar: {
      width: '44px',
      height: '44px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #c9a84c, #8b6914)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      color: '#0a0a1a',
      flexShrink: 0,
    },
    name: {
      fontFamily: "'Cinzel', serif",
      color: '#c9a84c',
      fontSize: '1rem',
      marginLeft: '12px',
      flex: 1,
    },
    followBtn: (isFollowing) => ({
      background: isFollowing ? 'rgba(201,168,76,0.15)' : '#c9a84c',
      color: isFollowing ? '#c9a84c' : '#0a0a1a',
      border: '1px solid #c9a84c',
      borderRadius: '20px',
      padding: '6px 16px',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '0.8rem',
      flexShrink: 0,
    }),
  };

  if (loading) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#c9a84c', fontFamily: "'Cinzel', serif", fontSize: '1.2rem' }}>
          ✨ Loading users...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <button style={styles.backBtn} onClick={() => navigate('/')}>← Back to Browse</button>
      <div style={styles.title}>Find Users</div>
      <input
        style={styles.searchBox}
        placeholder="Search by name..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: '#888', padding: '40px 20px' }}>
          No users found.
        </div>
      )}
      {filtered.map(user => (
        <div key={user.id} style={styles.card}>
          <div style={styles.avatar}>
            {(user.displayName || user.email || '?')[0].toUpperCase()}
          </div>
          <div style={styles.name}>
            {user.displayName || user.email?.split('@')[0] || 'Disney Fan'}
          </div>
          <button
            style={styles.followBtn(following.includes(user.id))}
            onClick={() => handleFollow(user.id)}
          >
            {following.includes(user.id) ? 'Following' : 'Follow'}
          </button>
        </div>
      ))}
    </div>
  );
}
