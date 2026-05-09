import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProfilePage from './ProfilePage';
import { LogOut } from 'lucide-react';

// Firebase imports
import { auth, db, storage } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ── Design tokens ─────────────────────────────────────────────
const PARK_COLORS = {
  'Magic Kingdom':     { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  'EPCOT':             { bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
  'Hollywood Studios': { bg: '#FFF7ED', text: '#9A3412', dot: '#F97316' },
  'Animal Kingdom':    { bg: '#F0FDF4', text: '#14532D', dot: '#22C55E' },
  'Disney Springs':    { bg: '#FDF4FF', text: '#6B21A8', dot: '#A855F7' },
};

const PRICE_ORDER = { '$': 1, '$$': 2, '$$$': 3 };

const CATEGORY_ICONS = {
  Snack:   '🍿',
  Meal:    '🍽️',
  Dessert: '🍰',
  Drink:   '🥤',
};
 
// ── Helpers ───────────────────────────────────────────────────
function StarRating({ rating, size = 14 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} width={size} height={size} viewBox="0 0 20 20"
          fill={s <= Math.round(rating) ? '#FBBF24' : '#E5E7EB'}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function ParkBadge({ park }) {
  const c = PARK_COLORS[park] || { bg: '#F3F4F6', text: '#374151', dot: '#9CA3AF' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: c.bg, color: c.text,
      fontSize: 11, fontWeight: 500,
      padding: '2px 8px', borderRadius: 99,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {park}
    </span>
  );
}

// ── ItemCard ──────────────────────────────────────────────────
function ItemCard({ item, userRatings, userLikes, onSelect }) {
  const myRating = userRatings?.[item.id];
  const liked    = userLikes?.includes?.(item.id);

  return (
    <button
      onClick={() => onSelect(item)}
      style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: 0, overflow: 'hidden',
        textAlign: 'left', cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.15s',
        display: 'flex', flexDirection: 'column', width: '100%',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-secondary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-tertiary)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{
        height: 140, background: 'var(--color-background-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 64, position: 'relative', overflow: 'hidden',
      }}>
        {item.photoUrl
          ? <img src={item.photoUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span>{item.image || CATEGORY_ICONS[item.category] || '🍴'}</span>
        }
        <span style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(0,0,0,0.55)', color: '#fff',
          fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
        }}>{item.price}</span>
        {liked && (
          <span style={{ position: 'absolute', top: 10, left: 10, color: '#F43F5E', fontSize: 16 }}>♥</span>
        )}
      </div>

      <div style={{ padding: '12px 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <p style={{ fontWeight: 500, fontSize: 15, margin: 0, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
            {item.name}
          </p>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', flexShrink: 0, paddingTop: 2 }}>
            {CATEGORY_ICONS[item.category]} {item.category}
          </span>
        </div>

        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
          📍 {item.location}
        </p>

        <ParkBadge park={item.park} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <StarRating rating={item.avgRating || 0} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {(item.avgRating || 0).toFixed(1)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            ({(item.totalRatings || 0).toLocaleString()})
          </span>
          {myRating && (
            <span style={{
              marginLeft: 'auto', fontSize: 11,
              background: 'var(--color-background-info)',
              color: 'var(--color-text-info)',
              padding: '1px 7px', borderRadius: 99, fontWeight: 500,
            }}>
              Your rating: {myRating.rating}
            </span>
          )}
        </div>

        {item.dietary?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {item.dietary.map(d => (
              <span key={d} style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 99,
                background: 'var(--color-background-success)',
                color: 'var(--color-text-success)',
              }}>{d}</span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

// ── ItemDetailModal ───────────────────────────────────────────
function ItemDetailModal({ item, currentUser, userRatings, onRate, onClose }) {
  const [rating, setRating]     = useState(userRatings?.[item.id]?.rating || 0);
  const [hover, setHover]       = useState(0);
  const [review, setReview]     = useState(userRatings?.[item.id]?.review || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    await onRate(item.id, rating, review, null);
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
    >
      <div style={{
        background: '#1a1a2e',
        borderRadius: 16,
        border: '0.5px solid rgba(255,255,255,0.1)',
        width: '100%', maxWidth: 480,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{
          height: 200, background: 'var(--color-background-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 80, position: 'relative', overflow: 'hidden',
          borderRadius: '16px 16px 0 0',
        }}>
          {item.photoUrl
            ? <img src={item.photoUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : item.image || CATEGORY_ICONS[item.category] || '🍴'
          }
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
            width: 32, height: 32, cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>×</button>
        </div>

        <div style={{ padding: '20px 20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: '#ffffff' }}>{item.name}</h2>
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{item.price}</span>
          </div>
          <p style={{ fontSize: 13, color: '#a0aec0', margin: '0 0 8px' }}>📍 {item.location}</p>
          <ParkBadge park={item.park} />
          <p style={{ fontSize: 14, color: '#cbd5e0', margin: '12px 0', lineHeight: 1.6 }}>{item.description}</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0' }}>
            <StarRating rating={item.avgRating || 0} size={16} />
            <span style={{ fontWeight: 500 }}>{(item.avgRating || 0).toFixed(1)}</span>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              from {(item.totalRatings || 0).toLocaleString()} ratings
            </span>
          </div>

          {item.dietary?.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
              {item.dietary.map(d => (
                <span key={d} style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 99,
                  background: 'var(--color-background-success)',
                  color: 'var(--color-text-success)',
                }}>{d}</span>
              ))}
            </div>
          )}

          {currentUser && (
            <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: 16, marginTop: 4 }}>
              <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 8px', color: '#ffffff' }}>
                {submitted ? '✓ Rating saved!' : 'Rate this dish'}
              </p>
              {!submitted && (
                <>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    {[1,2,3,4,5].map(s => (
                      <button key={s}
                        onMouseEnter={() => setHover(s)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => setRating(s)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                          fontSize: 28,
                          filter: s <= (hover || rating) ? 'none' : 'grayscale(1) opacity(0.3)',
                          transition: 'filter 0.1s',
                        }}
                      >⭐</button>
                    ))}
                  </div>
                  <textarea
                    value={review}
                    onChange={e => setReview(e.target.value)}
                    placeholder="Add a review (optional)…"
                    rows={2}
                    style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: 13 }}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!rating || submitting}
                    style={{
                      marginTop: 8, width: '100%',
                      background: rating ? '#EFF6FF' : 'var(--color-background-secondary)',
                      color: rating ? '#1D4ED8' : 'var(--color-text-secondary)',
                      border: '0.5px solid var(--color-border-secondary)',
                      borderRadius: 8, padding: '8px 0',
                      fontWeight: 500, cursor: rating ? 'pointer' : 'default',
                    }}
                  >
                    {submitting ? 'Saving…' : `Submit rating${rating ? ` (${rating}/5)` : ''}`}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MainContent ───────────────────────────────────────────────
function MainContent({ items, currentUser, onRate, userRatings, userLikes, wantToTry, parks, categories, priceRanges }) {
  const [searchTerm, setSearchTerm]             = useState('');
  const [selectedPark, setSelectedPark]         = useState('All Parks');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPrice, setSelectedPrice]       = useState('All');
  const [sortBy, setSortBy]                     = useState('highest');
  const [selectedItem, setSelectedItem]         = useState(null);

  const filtered = useMemo(() => {
    let result = [...items];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(i =>
        i.name?.toLowerCase().includes(q) ||
        i.location?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
      );
    }
    if (selectedPark !== 'All Parks') result = result.filter(i => i.park === selectedPark);
    if (selectedCategory !== 'All')   result = result.filter(i => i.category === selectedCategory);
    if (selectedPrice !== 'All')      result = result.filter(i => i.price === selectedPrice);
    result.sort((a, b) => {
      if (sortBy === 'highest')       return (b.avgRating || 0) - (a.avgRating || 0);
      if (sortBy === 'most_reviewed') return (b.totalRatings || 0) - (a.totalRatings || 0);
      if (sortBy === 'name_az')       return a.name.localeCompare(b.name);
      if (sortBy === 'price_low')     return (PRICE_ORDER[a.price] || 99) - (PRICE_ORDER[b.price] || 99);
      return 0;
    });
    return result;
  }, [items, searchTerm, selectedPark, selectedCategory, selectedPrice, sortBy]);

  const hasActiveFilters = searchTerm || selectedPark !== 'All Parks' || selectedCategory !== 'All' || selectedPrice !== 'All';

  const selectStyle = {
    fontSize: 13, padding: '6px 10px',
    border: '0.5px solid #D1D5DB',
    borderRadius: 8,
    background: 'white',
    cursor: 'pointer',
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: '#9CA3AF', pointerEvents: 'none', fontSize: 16,
        }}>🔍</span>
        <input
          type="text"
          placeholder="Search dishes, locations, parks…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%', paddingLeft: 38, paddingRight: searchTerm ? 38 : 12,
            boxSizing: 'border-box', fontSize: 14, padding: '10px 12px 10px 38px',
            border: '0.5px solid #D1D5DB', borderRadius: 10, outline: 'none',
          }}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18,
          }}>×</button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 20 }}>
        <select value={selectedPark} onChange={e => setSelectedPark(e.target.value)} style={selectStyle}>
          {(parks || ['All Parks','Magic Kingdom','EPCOT','Hollywood Studios','Animal Kingdom','Disney Springs']).map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={selectStyle}>
          {(categories || ['All','Snack','Meal','Dessert','Drink']).map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={selectedPrice} onChange={e => setSelectedPrice(e.target.value)} style={selectStyle}>
          {(priceRanges || ['All','$','$$','$$$']).map(p => <option key={p}>{p === 'All' ? 'Any price' : p}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyle}>
          <option value="highest">Highest rated</option>
          <option value="most_reviewed">Most reviewed</option>
          <option value="name_az">Name A–Z</option>
          <option value="price_low">Price low–high</option>
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#6B7280' }}>
          {filtered.length} of {items.length} items
        </span>
      </div>

      {/* Active park pill */}
      {selectedPark !== 'All Parks' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#EFF6FF', color: '#1D4ED8',
            fontSize: 12, padding: '3px 10px', borderRadius: 99,
          }}>
            {selectedPark}
            <button onClick={() => setSelectedPark('All Parks')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>×</button>
          </span>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6B7280' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🍴</div>
          <p style={{ fontWeight: 500, marginBottom: 6 }}>No dishes found</p>
          <p style={{ fontSize: 14 }}>
            {hasActiveFilters ? 'Try adjusting your filters or search term.' : 'No items in the database yet.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearchTerm(''); setSelectedPark('All Parks'); setSelectedCategory('All'); setSelectedPrice('All'); }}
              style={{ marginTop: 12, fontSize: 13, padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {filtered.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            userRatings={userRatings}
            userLikes={userLikes}
            onSelect={setSelectedItem}
          />
        ))}
      </div>

      {/* Detail modal */}
      {selectedItem && createPortal(
        <ItemDetailModal
          item={selectedItem}
          currentUser={currentUser}
          userRatings={userRatings}
          onRate={onRate}
          onClose={() => setSelectedItem(null)}
        />, document.body)}
    </div>
  );
}

// ── AuthScreen ────────────────────────────────────────────────
function AuthScreen({ onSignIn, onSignUp }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = isSignUp
      ? await onSignUp(email, password, displayName)
      : await onSignIn(email, password);
    if (!result.success) setError(result.error);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.cdnfonts.com/css/waltograph');
        .disney-title { font-family: 'Waltograph', cursive; letter-spacing: 0.08em; }
      `}</style>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #7C3AED, #2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          <h1 className="disney-title" style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>🏰 Ask The Dishes</h1>
          <p style={{ color: '#6B7280', textAlign: 'center', marginBottom: 24 }}>Rate and discover Disney World treats</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {isSignUp && (
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Display Name</label>
                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8, boxSizing: 'border-box' }}
                  placeholder="Your Name" required={isSignUp} />
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8, boxSizing: 'border-box' }}
                placeholder="you@example.com" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8, boxSizing: 'border-box' }}
                placeholder="••••••••" required minLength={6} />
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '10px 14px', borderRadius: 8, fontSize: 14 }}>
                {error}
              </div>
            )}

            <button type="submit" style={{
              background: '#7C3AED', color: 'white', padding: '10px',
              borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 15, cursor: 'pointer',
            }}>
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#7C3AED', cursor: 'pointer', fontSize: 14 }}>
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Header ────────────────────────────────────────────────────
function Header({ onSignOut }) {
  return (
    <>
      <style>{`
        @import url('https://fonts.cdnfonts.com/css/waltograph');
        .disney-title { font-family: 'Waltograph', cursive; letter-spacing: 0.08em; }
      `}</style>
      <header style={{ background: 'linear-gradient(90deg, #7C3AED, #2563EB)', color: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="disney-title" style={{ fontSize: 32, margin: 0 }}>🏰 Ask The Dishes</h1>
          <button onClick={onSignOut} style={{
            background: 'white', color: '#7C3AED', padding: '8px 16px',
            borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 14,
          }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </header>
    </>
  );
}

// ── App ───────────────────────────────────────────────────────
function MainApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [showAuth, setShowAuth]       = useState(true);

  const [items, setItems]           = useState([]);
  const [userRatings, setUserRatings] = useState({});
  const [userLikes, setUserLikes]   = useState([]);
  const [wantToTry, setWantToTry]   = useState([]);

  const parks       = ['All Parks', 'Magic Kingdom', 'EPCOT', 'Hollywood Studios', 'Animal Kingdom', 'Disney Springs'];
  const categories  = ['All', 'Snack', 'Meal', 'Dessert', 'Drink'];
  const priceRanges = ['All', '$', '$$', '$$$'];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user.uid);
        setShowAuth(false);
        loadUserData(user.uid);
      } else {
        setCurrentUser(null);
        setShowAuth(true);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => { loadItems(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadItems = async () => {
    try {
      const snap = await getDocs(collection(db, 'items'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(data.length ? data : getDefaultItems());
    } catch {
      setItems(getDefaultItems());
    }
  };

  const loadUserData = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const d = userDoc.data();
        setUserRatings(d.ratings || {});
        setUserLikes(d.likes || []);
        setWantToTry(d.wantToTry || []);
      }
    } catch (e) {
      console.error('Error loading user data:', e);
    }
  };

  const handleSignUp = async (email, password, displayName) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid, email, displayName: displayName || email.split('@')[0],
        createdAt: new Date().toISOString(),
        ratings: {}, likes: [], following: [], followers: [], wantToTry: [], tripPlan: [], totalCheckins: 0,
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const handleSignIn = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const handleSignOut = async () => {
    try { await signOut(auth); } catch (e) { console.error(e); }
  };

  const handleRate = async (itemId, rating, review, photoFile) => {
    if (!currentUser) return;
    try {
      let photoUrl = null;
      if (photoFile) {
        const storageRef = ref(storage, `food-photos/${currentUser}/${itemId}-${Date.now()}`);
        await uploadBytes(storageRef, photoFile);
        photoUrl = await getDownloadURL(storageRef);
      }
      const ratingData = { rating, review, photo: photoUrl, timestamp: new Date().toISOString(), userId: currentUser };
      await setDoc(doc(db, 'ratings', `${currentUser}_${itemId}`), ratingData);
      const newRatings = { ...userRatings, [itemId]: ratingData };
      setUserRatings(newRatings);
      await updateDoc(doc(db, 'users', currentUser), {
        [`ratings.${itemId}`]: ratingData,
        totalCheckins: Object.keys(newRatings).length,
      });
    } catch (e) {
      console.error('Error rating:', e);
    }
  };

  const getDefaultItems = () => [
  { id: '1', name: 'Dole Whip', location: 'Aloha Isle', park: 'Magic Kingdom', category: 'Dessert', avgRating: 4.8, totalRatings: 1247, description: 'The iconic pineapple soft-serve treat Disney fans crave.', image: '🍍', price: '$', dietary: ['Vegan', 'Dairy-Free'] },
  { id: '2', name: 'Dole Whip Float', location: 'Aloha Isle', park: 'Magic Kingdom', category: 'Dessert', avgRating: 4.9, totalRatings: 1654, description: 'Pineapple soft-serve floating in pineapple juice. Peak Disney.', image: '🍹', price: '$', dietary: ['Vegan', 'Dairy-Free'] },
  { id: '3', name: 'Mickey Premium Ice Cream Bar', location: 'Various Carts', park: 'Magic Kingdom', category: 'Dessert', avgRating: 4.6, totalRatings: 2341, description: 'Vanilla ice cream dipped in chocolate on a stick.', image: '🍫', price: '$', dietary: [] },
  { id: '4', name: 'Turkey Leg', location: 'Fantasyland Turkey Leg Cart', park: 'Magic Kingdom', category: 'Snack', avgRating: 4.2, totalRatings: 1876, description: 'Giant smoked turkey leg — the ultimate Disney walking snack.', image: '🍖', price: '$', dietary: ['Gluten-Free'] },
  { id: '5', name: 'Grey Stuff Cupcake', location: 'Be Our Guest Restaurant', park: 'Magic Kingdom', category: 'Dessert', avgRating: 4.7, totalRatings: 1432, description: 'Cookies and cream mousse on a cupcake.', image: '🍰', price: '$$', dietary: [] },
  { id: '6', name: 'Braised Pork', location: 'Be Our Guest Restaurant', park: 'Magic Kingdom', category: 'Meal', avgRating: 4.4, totalRatings: 743, description: 'Slow-braised pork with mashed potatoes and French green beans.', image: '🥩', price: '$$$', dietary: ['Gluten-Free Options'] },
  { id: '7', name: 'French Onion Soup', location: 'Be Our Guest Restaurant', park: 'Magic Kingdom', category: 'Meal', avgRating: 4.5, totalRatings: 812, description: 'Classic French onion soup with gruyere crouton.', image: '🍲', price: '$$$', dietary: ['Vegetarian'] },
  { id: '8', name: 'Main Street Cinnamon Roll', location: 'Main Street Bakery', park: 'Magic Kingdom', category: 'Snack', avgRating: 4.5, totalRatings: 987, description: 'Massive cinnamon roll with cream cheese icing.', image: '🌀', price: '$', dietary: ['Vegetarian'] },
  { id: '9', name: 'Cold Brew Coffee', location: 'Main Street Bakery', park: 'Magic Kingdom', category: 'Drink', avgRating: 4.3, totalRatings: 654, description: 'Smooth cold brew coffee.', image: '☕', price: '$', dietary: ['Vegan'] },
  { id: '10', name: "Gaston's Giant Cinnamon Roll", location: "Gaston's Tavern", park: 'Magic Kingdom', category: 'Snack', avgRating: 4.6, totalRatings: 1103, description: 'Enormous warm cinnamon roll.', image: '🥐', price: '$', dietary: ['Vegetarian'] },
  { id: '11', name: "LeFou's Brew", location: "Gaston's Tavern", park: 'Magic Kingdom', category: 'Drink', avgRating: 4.5, totalRatings: 876, description: 'Frozen apple juice with toasted marshmallow and passion fruit foam.', image: '🍺', price: '$', dietary: ['Vegan'] },
  { id: '12', name: 'PB&J Milkshake', location: "Friar's Nook", park: 'Magic Kingdom', category: 'Drink', avgRating: 4.4, totalRatings: 634, description: 'Peanut butter and jelly milkshake topped with whipped cream.', image: '🥤', price: '$', dietary: ['Vegetarian'] },
  { id: '13', name: 'Loaded Mac & Cheese', location: "Friar's Nook", park: 'Magic Kingdom', category: 'Snack', avgRating: 4.3, totalRatings: 521, description: 'Creamy mac and cheese loaded with bacon and crispy toppings.', image: '🧀', price: '$', dietary: [] },
  { id: '14', name: 'Jungle Juice', location: 'Adventureland Veranda', park: 'Magic Kingdom', category: 'Drink', avgRating: 4.1, totalRatings: 521, description: 'Tropical punch blend served in a souvenir cup.', image: '🧃', price: '$', dietary: ['Vegan'] },
  { id: '15', name: 'Tiki Pineapple Spear', location: 'Aloha Isle', park: 'Magic Kingdom', category: 'Snack', avgRating: 4.2, totalRatings: 412, description: 'Fresh pineapple spear.', image: '🍍', price: '$', dietary: ['Vegan', 'Gluten-Free'] },
  { id: '16', name: 'Chicken Nuggets Kids Meal', location: 'Pinocchio Village Haus', park: 'Magic Kingdom', category: 'Meal', avgRating: 4.0, totalRatings: 876, description: "Classic kids meal with a front row view of It's a Small World.", image: '🍗', price: '$', dietary: [] },
  { id: '17', name: 'Flatbread Pizza', location: 'Pinocchio Village Haus', park: 'Magic Kingdom', category: 'Meal', avgRating: 4.1, totalRatings: 654, description: 'Thin crust flatbread pizza with marinara and mozzarella.', image: '🍕', price: '$', dietary: ['Vegetarian'] },
  { id: '18', name: 'Skipper Canteen Falafel', location: 'Jungle Navigation Co. Skipper Canteen', park: 'Magic Kingdom', category: 'Meal', avgRating: 4.2, totalRatings: 398, description: 'Crispy falafel with hummus and tabbouleh.', image: '🧆', price: '$$', dietary: ['Vegetarian', 'Vegan'] },
  { id: '19', name: 'Skipper Canteen Fish', location: 'Jungle Navigation Co. Skipper Canteen', park: 'Magic Kingdom', category: 'Meal', avgRating: 4.3, totalRatings: 421, description: 'Pan-seared sustainable fish with seasonal sides.', image: '🐟', price: '$$', dietary: ['Gluten-Free Options'] },
  { id: '20', name: 'Toffee Assortment', location: 'The Confectionery', park: 'Magic Kingdom', category: 'Dessert', avgRating: 4.3, totalRatings: 412, description: 'Handmade toffee pieces from the classic Main Street candy shop.', image: '🍬', price: '$', dietary: [] },
  { id: '21', name: 'Caramel Apple', location: 'The Confectionery', park: 'Magic Kingdom', category: 'Dessert', avgRating: 4.4, totalRatings: 534, description: 'Crisp apple dipped in house-made caramel.', image: '🍎', price: '$', dietary: ['Vegetarian'] },
  { id: '22', name: 'Mickey Pretzel', location: 'Various Carts', park: 'Magic Kingdom', category: 'Snack', avgRating: 4.2, totalRatings: 987, description: "Warm soft pretzel shaped like Mickey's iconic silhouette.", image: '🥨', price: '$', dietary: ['Vegetarian'] },
  { id: '23', name: 'Chili-Lime Corn', location: 'Various Carts', park: 'Magic Kingdom', category: 'Snack', avgRating: 4.1, totalRatings: 345, description: 'Fresh corn on the cob seasoned with chili and lime.', image: '🌽', price: '$', dietary: ['Vegan', 'Gluten-Free'] },
  { id: '24', name: 'Strawberry Shortcake Waffle', location: 'Storybook Treats', park: 'Magic Kingdom', category: 'Dessert', avgRating: 4.5, totalRatings: 567, description: 'Warm waffle topped with strawberries and whipped cream.', image: '🧇', price: '$', dietary: ['Vegetarian'] },
  { id: '25', name: 'Chocolate Soft-Serve', location: 'Storybook Treats', park: 'Magic Kingdom', category: 'Dessert', avgRating: 4.4, totalRatings: 489, description: 'Rich chocolate soft-serve in a cone or cup.', image: '🍦', price: '$', dietary: ['Vegetarian'] },
  { id: '26', name: 'Roasted Chicken', location: 'Pecos Bill Tall Tale Inn & Cafe', park: 'Magic Kingdom', category: 'Meal', avgRating: 4.1, totalRatings: 423, description: 'Seasoned roasted half chicken with mashed potatoes and veggies.', image: '🍗', price: '$$', dietary: ['Gluten-Free'] },
  { id: '27', name: 'Nachos', location: 'Pecos Bill Tall Tale Inn & Cafe', park: 'Magic Kingdom', category: 'Snack', avgRating: 4.0, totalRatings: 376, description: 'Tortilla chips loaded with queso, jalapenos and pico de gallo.', image: '🫔', price: '$', dietary: ['Vegetarian'] },
  { id: '28', name: "Cinderella Royal Table Feast", location: "Cinderella's Royal Table", park: 'Magic Kingdom', category: 'Meal', avgRating: 4.7, totalRatings: 1234, description: 'Multi-course prix fixe dinner inside the castle.', image: '👑', price: '$$$$', dietary: ['Gluten-Free Options'] },
  { id: '29', name: 'Royal Dessert', location: "Cinderella's Royal Table", park: 'Magic Kingdom', category: 'Dessert', avgRating: 4.6, totalRatings: 876, description: 'Rotating themed dessert at the conclusion of your Royal Table meal.', image: '🏰', price: '$$$$', dietary: ['Vegetarian'] },
  { id: '30', name: 'Crystal Palace Buffet', location: 'The Crystal Palace', park: 'Magic Kingdom', category: 'Meal', avgRating: 4.4, totalRatings: 1023, description: 'All-you-can-eat buffet with Pooh and friends.', image: '🍽️', price: '$$$', dietary: ['Gluten-Free Options'] },
  { id: '31', name: 'Liberty Tree Pot Roast', location: 'Liberty Tree Tavern', park: 'Magic Kingdom', category: 'Meal', avgRating: 4.5, totalRatings: 789, description: 'Slow-roasted pot roast with mashed potatoes.', image: '🥩', price: '$$$', dietary: ['Gluten-Free Options'] },
  { id: '32', name: 'New England Clam Chowder', location: 'Columbia Harbour House', park: 'Magic Kingdom', category: 'Meal', avgRating: 4.4, totalRatings: 654, description: 'Creamy clam chowder in a sourdough bread bowl.', image: '🍲', price: '$$', dietary: [] },
  { id: '33', name: 'Fried Fish Basket', location: 'Columbia Harbour House', park: 'Magic Kingdom', category: 'Meal', avgRating: 4.2, totalRatings: 543, description: 'Beer-battered fish with fries and tartar sauce.', image: '🐟', price: '$$', dietary: [] },
  { id: '34', name: 'Hummus & Veggies', location: 'Columbia Harbour House', park: 'Magic Kingdom', category: 'Snack', avgRating: 4.1, totalRatings: 312, description: 'Fresh vegetables with house-made hummus dip.', image: '🥦', price: '$', dietary: ['Vegan', 'Gluten-Free'] },
  { id: '35', name: 'Citrus Swirl', location: 'Sunshine Tree Terrace', park: 'Magic Kingdom', category: 'Dessert', avgRating: 4.6, totalRatings: 723, description: 'Orange-flavored soft serve with hints of cream.', image: '🍊', price: '$', dietary: ['Vegetarian'] },
  { id: '36', name: 'Aloha Isle Raspberry Swirl', location: 'Aloha Isle', park: 'Magic Kingdom', category: 'Dessert', avgRating: 4.4, totalRatings: 389, description: 'Raspberry soft-serve twist.', image: '🫐', price: '$', dietary: ['Vegan', 'Dairy-Free'] },
  { id: '37', name: "Tony's Town Square Pasta", location: "Tony's Town Square Restaurant", park: 'Magic Kingdom', category: 'Meal', avgRating: 4.2, totalRatings: 567, description: 'Classic Italian pasta in the Lady and the Tramp-themed restaurant.', image: '🍝', price: '$$$', dietary: ['Vegetarian Options'] },
  { id: '38', name: 'Main Street Popcorn', location: 'Main Street Popcorn Cart', park: 'Magic Kingdom', category: 'Snack', avgRating: 4.3, totalRatings: 1432, description: 'Fresh-popped buttered popcorn.', image: '🍿', price: '$', dietary: ['Vegetarian', 'Gluten-Free'] },
  { id: '39', name: 'School Bread', location: 'Kringla Bakeri Og Kafe', park: 'EPCOT', category: 'Snack', avgRating: 4.7, totalRatings: 893, description: 'Norwegian cardamom bun filled with custard and rolled in coconut.', image: '🍞', price: '$', dietary: [] },
  { id: '40', name: 'Lefse', location: 'Kringla Bakeri Og Kafe', park: 'EPCOT', category: 'Snack', avgRating: 4.3, totalRatings: 456, description: 'Traditional Norwegian potato flatbread with butter and cinnamon sugar.', image: '🫓', price: '$', dietary: ['Vegetarian'] },
  { id: '41', name: 'Rice Cream', location: 'Kringla Bakeri Og Kafe', park: 'EPCOT', category: 'Dessert', avgRating: 4.4, totalRatings: 378, description: 'Scandinavian rice pudding with fruit sauce.', image: '🍮', price: '$', dietary: ['Vegetarian'] },
  { id: '42', name: 'Croque Monsieur', location: 'Les Halles Boulangerie-Patisserie', park: 'EPCOT', category: 'Meal', avgRating: 4.6, totalRatings: 789, description: 'Classic French ham and cheese toasted sandwich with bechamel.', image: '🥪', price: '$$', dietary: [] },
  { id: '43', name: 'Croissant', location: 'Les Halles Boulangerie-Patisserie', park: 'EPCOT', category: 'Snack', avgRating: 4.5, totalRatings: 654, description: 'Perfectly flaky, buttery croissant baked fresh daily.', image: '🥐', price: '$', dietary: ['Vegetarian'] },
  { id: '44', name: 'Napoleon', location: 'Les Halles Boulangerie-Patisserie', park: 'EPCOT', category: 'Dessert', avgRating: 4.7, totalRatings: 543, description: 'Layers of puff pastry and vanilla cream.', image: '🍰', price: '$', dietary: ['Vegetarian'] },
  { id: '45', name: 'Lobster Bisque', location: 'Les Halles Boulangerie-Patisserie', park: 'EPCOT', category: 'Meal', avgRating: 4.5, totalRatings: 612, description: 'Rich, creamy lobster bisque served in a bread bowl.', image: '🦞', price: '$$', dietary: [] },
  { id: '46', name: 'Caramel Corn', location: 'Karamell-Kuche', park: 'EPCOT', category: 'Snack', avgRating: 4.4, totalRatings: 734, description: "Fresh-made Werther's caramel drizzled over crispy popcorn.", image: '🍿', price: '$', dietary: ['Vegetarian'] },
  { id: '47', name: 'Caramel Covered Apple', location: 'Karamell-Kuche', park: 'EPCOT', category: 'Dessert', avgRating: 4.5, totalRatings: 523, description: "Crisp apple smothered in Werther's caramel.", image: '🍎', price: '$', dietary: ['Vegetarian'] },
  { id: '48', name: 'Karamell Cheesecake', location: 'Karamell-Kuche', park: 'EPCOT', category: 'Dessert', avgRating: 4.6, totalRatings: 412, description: "Creamy cheesecake topped with Werther's caramel drizzle.", image: '🍮', price: '$', dietary: ['Vegetarian'] },
  { id: '49', name: 'Bubble Waffle', location: 'Joy of Tea', park: 'EPCOT', category: 'Dessert', avgRating: 4.6, totalRatings: 689, description: 'Hong Kong-style egg waffle with ice cream and toppings.', image: '🧇', price: '$', dietary: ['Vegetarian'] },
  { id: '50', name: 'Pork Bao Bun', location: 'Joy of Tea', park: 'EPCOT', category: 'Snack', avgRating: 4.4, totalRatings: 567, description: 'Steamed pork-filled bao bun from the China pavilion.', image: '🥟', price: '$', dietary: [] },
  { id: '51', name: 'Frozen Honey Oolong Tea', location: 'Joy of Tea', park: 'EPCOT', category: 'Drink', avgRating: 4.3, totalRatings: 478, description: 'Chilled honey oolong tea.', image: '🍵', price: '$', dietary: ['Vegan'] },
  { id: '52', name: 'Avocado Margarita', location: 'La Cava del Tequila', park: 'EPCOT', category: 'Drink', avgRating: 4.8, totalRatings: 1123, description: 'Frozen avocado margarita — the most talked-about drink at EPCOT.', image: '🍸', price: '$$', dietary: ['Vegan'] },
  { id: '53', name: 'Mango Margarita', location: 'La Cava del Tequila', park: 'EPCOT', category: 'Drink', avgRating: 4.6, totalRatings: 876, description: 'Frozen mango margarita with a chili-lime rim.', image: '🥭', price: '$$', dietary: ['Vegan'] },
  { id: '54', name: 'Tacos al Pastor', location: 'La Hacienda de San Angel', park: 'EPCOT', category: 'Meal', avgRating: 4.4, totalRatings: 534, description: 'Slow-cooked pork tacos with pineapple and cilantro.', image: '🌮', price: '$$$', dietary: [] },
  { id: '55', name: 'Guacamole', location: 'La Hacienda de San Angel', park: 'EPCOT', category: 'Snack', avgRating: 4.5, totalRatings: 423, description: 'Fresh tableside guacamole with house-made tortilla chips.', image: '🥑', price: '$$', dietary: ['Vegan', 'Gluten-Free'] },
  { id: '56', name: 'Stroopwafel', location: 'Netherlands Pavilion Cart', park: 'EPCOT', category: 'Snack', avgRating: 4.3, totalRatings: 398, description: 'Warm Dutch caramel waffle cookie.', image: '🍪', price: '$', dietary: ['Vegetarian'] },
  { id: '57', name: 'Sushi Platter', location: 'Tokyo Dining', park: 'EPCOT', category: 'Meal', avgRating: 4.3, totalRatings: 543, description: "Chef's selection of fresh nigiri and maki rolls.", image: '🍱', price: '$$$', dietary: ['Gluten-Free Options'] },
  { id: '58', name: 'Miso Soup', location: 'Tokyo Dining', park: 'EPCOT', category: 'Snack', avgRating: 4.2, totalRatings: 312, description: 'Classic miso soup with tofu and scallions.', image: '🍜', price: '$', dietary: ['Vegan'] },
  { id: '59', name: 'Beef Bulgogi', location: 'Nine Dragons Restaurant', park: 'EPCOT', category: 'Meal', avgRating: 4.2, totalRatings: 467, description: 'Korean-style marinated beef served with steamed rice and vegetables.', image: '🥢', price: '$$', dietary: ['Gluten-Free Options'] },
  { id: '60', name: 'Spicy Tuna Roll', location: 'Takumi-Tei', park: 'EPCOT', category: 'Meal', avgRating: 4.6, totalRatings: 389, description: "Spicy tuna and cucumber maki from EPCOT's premium Japanese restaurant.", image: '🍣', price: '$$$', dietary: ['Gluten-Free Options'] },
  { id: '61', name: 'Wagyu Beef', location: 'Takumi-Tei', park: 'EPCOT', category: 'Meal', avgRating: 4.8, totalRatings: 312, description: 'Premium Japanese wagyu beef — the crown jewel of EPCOT dining.', image: '🥩', price: '$$$$', dietary: ['Gluten-Free'] },
  { id: '62', name: 'Lamb Chops', location: 'Spice Road Table', park: 'EPCOT', category: 'Meal', avgRating: 4.5, totalRatings: 478, description: 'Grilled lamb chops with harissa and Mediterranean sides.', image: '🍖', price: '$$$', dietary: ['Gluten-Free'] },
  { id: '63', name: 'Hummus Platter', location: 'Spice Road Table', park: 'EPCOT', category: 'Snack', avgRating: 4.3, totalRatings: 356, description: 'House-made hummus with warm flatbread and olives.', image: '🫓', price: '$$', dietary: ['Vegan'] },
  { id: '64', name: 'Baklava', location: 'Spice Road Table', park: 'EPCOT', category: 'Dessert', avgRating: 4.5, totalRatings: 289, description: 'Honey-soaked phyllo pastry with pistachios.', image: '🍯', price: '$', dietary: ['Vegetarian'] },
  { id: '65', name: 'Fish & Chips', location: 'Rose & Crown Pub', park: 'EPCOT', category: 'Meal', avgRating: 4.4, totalRatings: 789, description: 'Classic British beer-battered fish and thick-cut chips with malt vinegar.', image: '🐟', price: '$$', dietary: [] },
  { id: '66', name: 'Scotch Egg', location: 'Rose & Crown Pub', park: 'EPCOT', category: 'Snack', avgRating: 4.3, totalRatings: 456, description: 'Hard-boiled egg wrapped in sausage meat and breadcrumbs, deep fried.', image: '🥚', price: '$$', dietary: [] },
  { id: '67', name: 'Yorkshire Pudding', location: 'Rose & Crown Pub', park: 'EPCOT', category: 'Snack', avgRating: 4.2, totalRatings: 345, description: 'Traditional Yorkshire pudding with gravy.', image: '🍞', price: '$', dietary: ['Vegetarian'] },
  { id: '68', name: 'Wiener Schnitzel', location: 'Biergarten Restaurant', park: 'EPCOT', category: 'Meal', avgRating: 4.4, totalRatings: 567, description: 'Crispy breaded pork cutlet — a German classic at the buffet.', image: '🥩', price: '$$$', dietary: [] },
  { id: '69', name: 'Bratwurst', location: 'Sommerfest', park: 'EPCOT', category: 'Meal', avgRating: 4.5, totalRatings: 678, description: 'Grilled German bratwurst in a pretzel roll with mustard and sauerkraut.', image: '🌭', price: '$', dietary: [] },
  { id: '70', name: 'Frozen Apple Strudel', location: 'Sommerfest', park: 'EPCOT', category: 'Dessert', avgRating: 4.3, totalRatings: 423, description: 'Chilled apple strudel slice with vanilla sauce.', image: '🥧', price: '$', dietary: ['Vegetarian'] },
  { id: '71', name: 'Crepes', location: "L'Artisan des Glaces", park: 'EPCOT', category: 'Dessert', avgRating: 4.5, totalRatings: 534, description: 'Thin French crepes filled with ice cream and toppings.', image: '🫓', price: '$', dietary: ['Vegetarian'] },
  { id: '72', name: 'Macaron Ice Cream Sandwich', location: "L'Artisan des Glaces", park: 'EPCOT', category: 'Dessert', avgRating: 4.7, totalRatings: 689, description: 'French macarons sandwiched around artisan ice cream.', image: '🍦', price: '$', dietary: ['Vegetarian'] },
  { id: '73', name: 'Gelato', location: "L'Artisan des Glaces", park: 'EPCOT', category: 'Dessert', avgRating: 4.6, totalRatings: 578, description: 'Rotating seasonal gelato flavors from the France pavilion.', image: '🍨', price: '$', dietary: ['Vegetarian'] },
  { id: '74', name: 'Coxinha', location: 'Brazil Kiosk', park: 'EPCOT', category: 'Snack', avgRating: 4.4, totalRatings: 312, description: 'Crispy Brazilian chicken croquette.', image: '🍗', price: '$', dietary: [] },
  { id: '75', name: 'Via Napoli Margherita Pizza', location: 'Via Napoli Ristorante e Pizzeria', park: 'EPCOT', category: 'Meal', avgRating: 4.6, totalRatings: 892, description: 'Neapolitan-style pizza with San Marzano tomatoes and fresh mozzarella.', image: '🍕', price: '$$$', dietary: ['Vegetarian'] },
  { id: '76', name: 'Cannoli', location: 'Via Napoli Ristorante e Pizzeria', park: 'EPCOT', category: 'Dessert', avgRating: 4.5, totalRatings: 456, description: 'Crispy pastry shell filled with sweet ricotta cream.', image: '🍮', price: '$$', dietary: ['Vegetarian'] },
  { id: '77', name: 'Ronto Wrap', location: 'Ronto Roasters', park: 'Hollywood Studios', category: 'Meal', avgRating: 4.3, totalRatings: 781, description: 'Roasted pork, grilled sausage, peppercorn sauce in a warm pita.', image: '🌯', price: '$$', dietary: [] },
  { id: '78', name: 'Ronto Morning Wrap', location: 'Ronto Roasters', park: 'Hollywood Studios', category: 'Meal', avgRating: 4.5, totalRatings: 634, description: 'Breakfast version with egg, cheese and turkey sausage in a warm pita.', image: '🌯', price: '$', dietary: [] },
  { id: '79', name: 'Blue Milk', location: 'Milk Stand', park: 'Hollywood Studios', category: 'Drink', avgRating: 4.0, totalRatings: 1456, description: 'Frozen plant-based blue milk from a galaxy far, far away.', image: '🥛', price: '$', dietary: ['Vegan', 'Dairy-Free'] },
  { id: '80', name: 'Green Milk', location: 'Milk Stand', park: 'Hollywood Studios', category: 'Drink', avgRating: 4.1, totalRatings: 1234, description: 'Frozen plant-based green milk — citrus and tropical flavors.', image: '🥛', price: '$', dietary: ['Vegan', 'Dairy-Free'] },
  { id: '81', name: "Outpost Popcorn Mix", location: "Kat Saka's Kettle", park: 'Hollywood Studios', category: 'Snack', avgRating: 4.2, totalRatings: 654, description: 'Sweet, savory and spicy popcorn blend in a galaxy-themed bucket.', image: '🍿', price: '$', dietary: ['Vegan'] },
  { id: '82', name: 'Meiloorun Fruit Juice', location: "Kat Saka's Kettle", park: 'Hollywood Studios', category: 'Drink', avgRating: 4.0, totalRatings: 423, description: 'Cantaloupe-watermelon juice drink.', image: '🍈', price: '$', dietary: ['Vegan'] },
  { id: '83', name: 'Breakfast Plate', location: "Woody's Lunch Box", park: 'Hollywood Studios', category: 'Meal', avgRating: 4.6, totalRatings: 1023, description: 'Totchos, egg, bacon and cheese — the best breakfast in the park.', image: '🍳', price: '$', dietary: [] },
  { id: '84', name: 'Totchos', location: "Woody's Lunch Box", park: 'Hollywood Studios', category: 'Snack', avgRating: 4.7, totalRatings: 943, description: 'Tater tot nachos loaded with chili, cheese, jalapenos and sour cream.', image: '🧀', price: '$', dietary: [] },
  { id: '85', name: 'Grilled Cheese & Tomato Soup', location: "Woody's Lunch Box", park: 'Hollywood Studios', category: 'Meal', avgRating: 4.5, totalRatings: 876, description: 'Creamy tomato-basil soup with a crispy grilled cheese sandwich.', image: '🥪', price: '$', dietary: ['Vegetarian'] },
  { id: '86', name: 'Lunch Box Tart', location: "Woody's Lunch Box", park: 'Hollywood Studios', category: 'Dessert', avgRating: 4.4, totalRatings: 567, description: 'Warm Pop-Tart-style pastry with seasonal fruit filling.', image: '🥧', price: '$', dietary: ['Vegetarian'] },
  { id: '87', name: "S'mores French Toast", location: "Woody's Lunch Box", park: 'Hollywood Studios', category: 'Meal', avgRating: 4.6, totalRatings: 712, description: 'Thick French toast with chocolate hazelnut spread, marshmallow, and graham crumbles.', image: '🍞', price: '$', dietary: ['Vegetarian'] },
  { id: '88', name: 'Carbon-Freeze Me Cocktail', location: "Oga's Cantina", park: 'Hollywood Studios', category: 'Drink', avgRating: 4.6, totalRatings: 812, description: "Blue, smoky frozen cocktail — one of the signature drinks at Oga's.", image: '🍹', price: '$$', dietary: [] },
  { id: '89', name: 'Fuzzy Tauntaun', location: "Oga's Cantina", park: 'Hollywood Studios', category: 'Drink', avgRating: 4.5, totalRatings: 756, description: 'Peach cocktail with a tingling carbonite foam on top.', image: '🍺', price: '$$', dietary: [] },
  { id: '90', name: 'Batuu Bits', location: "Oga's Cantina", park: 'Hollywood Studios', category: 'Snack', avgRating: 4.1, totalRatings: 489, description: 'Seasoned popcorn served alongside cantina drinks.', image: '🍿', price: '$', dietary: ['Vegan'] },
  { id: '91', name: 'Braised Shaak Roast', location: 'Docking Bay 7', park: 'Hollywood Studios', category: 'Meal', avgRating: 4.3, totalRatings: 567, description: 'Slow-cooked beef with pickled vegetables and roasted root veggies.', image: '🥩', price: '$$', dietary: ['Gluten-Free Options'] },
  { id: '92', name: 'Felucian Garden Spread', location: 'Docking Bay 7', park: 'Hollywood Studios', category: 'Meal', avgRating: 4.0, totalRatings: 345, description: 'Plant-based kefta with hummus, pita and seasonal veggies.', image: '🥗', price: '$$', dietary: ['Vegan'] },
  { id: '93', name: 'Endorian Tip Yip Meal', location: 'Docking Bay 7', park: 'Hollywood Studios', category: 'Meal', avgRating: 4.2, totalRatings: 489, description: 'Fried chicken with mashed potatoes and roasted vegetables.', image: '🍗', price: '$$', dietary: [] },
  { id: '94', name: 'Batuu-bon', location: 'Docking Bay 7', park: 'Hollywood Studios', category: 'Dessert', avgRating: 4.3, totalRatings: 412, description: 'Chocolate-mousse-filled dome with a starry galaxy exterior.', image: '🍫', price: '$', dietary: ['Vegetarian'] },
  { id: '95', name: 'Hollywood Brown Derby Cobb Salad', location: 'The Hollywood Brown Derby', park: 'Hollywood Studios', category: 'Meal', avgRating: 4.5, totalRatings: 678, description: 'The original Cobb salad served tableside.', image: '🥗', price: '$$$', dietary: ['Gluten-Free Options'] },
  { id: '96', name: 'Grapefruit Cake', location: 'The Hollywood Brown Derby', park: 'Hollywood Studios', category: 'Dessert', avgRating: 4.7, totalRatings: 543, description: 'Chiffon cake with grapefruit cream cheese frosting — a true icon.', image: '🍰', price: '$$$', dietary: [] },
  { id: '97', name: '50s Prime Time Pot Roast', location: "50's Prime Time Cafe", park: 'Hollywood Studios', category: 'Meal', avgRating: 4.4, totalRatings: 712, description: "Mom's pot roast with mashed potatoes.", image: '🥩', price: '$$$', dietary: ['Gluten-Free Options'] },
  { id: '98', name: 'PB&J Milkshake', location: 'Sci-Fi Dine-In Theater', park: 'Hollywood Studios', category: 'Drink', avgRating: 4.4, totalRatings: 398, description: 'Peanut butter and jelly milkshake served under the stars.', image: '🥤', price: '$$', dietary: ['Vegetarian'] },
  { id: '99', name: 'Sci-Fi Burger', location: 'Sci-Fi Dine-In Theater', park: 'Hollywood Studios', category: 'Meal', avgRating: 4.3, totalRatings: 567, description: 'Classic smash burger with cheese and all the fixings, eaten in a vintage car.', image: '🍔', price: '$$', dietary: [] },
  { id: '100', name: "Mama Melrose Chicken Parm", location: "Mama Melrose's Ristorante Italiano", park: 'Hollywood Studios', category: 'Meal', avgRating: 4.3, totalRatings: 489, description: 'Breaded chicken parmesan with house marinara and melted mozzarella.', image: '🍗', price: '$$$', dietary: [] },
  { id: '101', name: 'Mickey Waffle', location: 'Baseline Tap House', park: 'Hollywood Studios', category: 'Snack', avgRating: 4.2, totalRatings: 312, description: 'Mickey-shaped waffle with syrup.', image: '🧇', price: '$', dietary: ['Vegetarian'] },
  { id: '102', name: 'Craft Beer Flight', location: 'Baseline Tap House', park: 'Hollywood Studios', category: 'Drink', avgRating: 4.4, totalRatings: 456, description: 'Rotating selection of California craft beers.', image: '🍺', price: '$$', dietary: [] },
  { id: '103', name: 'Sparkling Wine', location: 'Baseline Tap House', park: 'Hollywood Studios', category: 'Drink', avgRating: 4.3, totalRatings: 345, description: 'Crisp California sparkling wine served by the glass.', image: '🥂', price: '$$', dietary: ['Vegan'] },
  { id: '104', name: "Satu'li Bowl", location: "Satu'li Canteen", park: 'Animal Kingdom', category: 'Meal', avgRating: 4.4, totalRatings: 1102, description: 'Build-your-own bowl with grains, proteins and flavorful sauces.', image: '🥗', price: '$$', dietary: ['Gluten-Free Options'] },
  { id: '105', name: 'Cheeseburger Bao Bun', location: "Satu'li Canteen", park: 'Animal Kingdom', category: 'Meal', avgRating: 4.5, totalRatings: 823, description: 'Cheeseburger filling in a soft steamed bao bun.', image: '🥟', price: '$$', dietary: [] },
  { id: '106', name: 'Pandora Cheesecake', location: "Satu'li Canteen", park: 'Animal Kingdom', category: 'Dessert', avgRating: 4.6, totalRatings: 712, description: 'Chocolate cheesecake with passion fruit cream and glowing colors.', image: '🍮', price: '$', dietary: ['Vegetarian'] },
  { id: '107', name: 'Night Blossom', location: 'Pongu Pongu', park: 'Animal Kingdom', category: 'Drink', avgRating: 4.5, totalRatings: 934, description: "Limeade with passion fruit and watermelon pops — Pandora's signature drink.", image: '🌸', price: '$', dietary: ['Vegan'] },
  { id: '108', name: 'Pongu Lumpia', location: 'Pongu Pongu', park: 'Animal Kingdom', category: 'Snack', avgRating: 4.4, totalRatings: 623, description: 'Pineapple cream cheese spring roll — a Pandora fan favorite.', image: '🧆', price: '$', dietary: ['Vegetarian'] },
  { id: '109', name: 'Flame Tree BBQ Ribs', location: 'Flame Tree Barbecue', park: 'Animal Kingdom', category: 'Meal', avgRating: 4.6, totalRatings: 1234, description: 'Slow-smoked St. Louis ribs with house BBQ sauce and two sides.', image: '🍖', price: '$$', dietary: ['Gluten-Free Options'] },
  { id: '110', name: 'Pulled Pork Sandwich', location: 'Flame Tree Barbecue', park: 'Animal Kingdom', category: 'Meal', avgRating: 4.4, totalRatings: 876, description: 'Tender pulled pork on a brioche bun with slaw and pickles.', image: '🥪', price: '$$', dietary: [] },
  { id: '111', name: 'Smoked Turkey Leg', location: 'Flame Tree Barbecue', park: 'Animal Kingdom', category: 'Snack', avgRating: 4.3, totalRatings: 654, description: 'Hickory-smoked turkey leg with a crispy seasoned skin.', image: '🍗', price: '$', dietary: ['Gluten-Free'] },
  { id: '112', name: 'BBQ Baked Beans', location: 'Flame Tree Barbecue', park: 'Animal Kingdom', category: 'Snack', avgRating: 4.1, totalRatings: 389, description: 'Slow-cooked smoky baked beans.', image: '🫘', price: '$', dietary: ['Vegan', 'Gluten-Free'] },
  { id: '113', name: 'Spicy Durban Chicken', location: 'Harambe Market', park: 'Animal Kingdom', category: 'Meal', avgRating: 4.3, totalRatings: 567, description: 'South African Durban-spiced grilled chicken with pap and chakalaka.', image: '🍗', price: '$$', dietary: ['Gluten-Free'] },
  { id: '114', name: 'Ribs Platter', location: 'Harambe Market', park: 'Animal Kingdom', category: 'Meal', avgRating: 4.4, totalRatings: 612, description: 'South African-spiced slow-cooked pork ribs with corn on the cob.', image: '🍖', price: '$$', dietary: ['Gluten-Free'] },
  { id: '115', name: 'Gyro', location: 'Harambe Market', park: 'Animal Kingdom', category: 'Meal', avgRating: 4.2, totalRatings: 423, description: 'Beef and lamb gyro in a warm pita with tzatziki and fresh vegetables.', image: '🌯', price: '$', dietary: [] },
  { id: '116', name: 'Kachumbari Salad', location: 'Harambe Market', park: 'Animal Kingdom', category: 'Snack', avgRating: 4.1, totalRatings: 289, description: 'East African tomato and onion salad with fresh herbs.', image: '🥗', price: '$', dietary: ['Vegan', 'Gluten-Free'] },
  { id: '117', name: 'Pot Stickers', location: 'Yak & Yeti Restaurant', park: 'Animal Kingdom', category: 'Meal', avgRating: 4.5, totalRatings: 789, description: 'Pan-fried pork and vegetable dumplings with tangy dipping sauce.', image: '🥟', price: '$$', dietary: [] },
  { id: '118', name: 'Honey Chicken', location: 'Yak & Yeti Restaurant', park: 'Animal Kingdom', category: 'Meal', avgRating: 4.4, totalRatings: 654, description: 'Crispy chicken tossed in honey sauce with steamed rice and veggies.', image: '🍯', price: '$$', dietary: [] },
  { id: '119', name: 'Ahi Tuna Nachos', location: 'Yak & Yeti Restaurant', park: 'Animal Kingdom', category: 'Snack', avgRating: 4.6, totalRatings: 534, description: 'Wonton chips topped with seared ahi tuna and spicy mayo.', image: '🐟', price: '$$', dietary: [] },
  { id: '120', name: 'Mango Pie', location: 'Yak & Yeti Restaurant', park: 'Animal Kingdom', category: 'Dessert', avgRating: 4.5, totalRatings: 423, description: 'Creamy mango pie with graham cracker crust and whipped cream.', image: '🥭', price: '$$', dietary: ['Vegetarian'] },
  { id: '121', name: 'Fried Egg Roll', location: 'Yak & Yeti Local Foods', park: 'Animal Kingdom', category: 'Snack', avgRating: 4.3, totalRatings: 567, description: 'Crispy egg rolls with Asian slaw and sweet chili dipping sauce.', image: '🥟', price: '$', dietary: [] },
  { id: '122', name: 'Tikka Masala', location: 'Yak & Yeti Local Foods', park: 'Animal Kingdom', category: 'Meal', avgRating: 4.4, totalRatings: 489, description: 'Chicken tikka masala with basmati rice and naan bread.', image: '🍛', price: '$', dietary: ['Gluten-Free Options'] },
  { id: '123', name: 'Tiffins Bread Service', location: 'Tiffins Restaurant', park: 'Animal Kingdom', category: 'Snack', avgRating: 4.8, totalRatings: 567, description: 'Complimentary bread service with whipped butter and dipping sauces.', image: '🍞', price: '$$$', dietary: ['Vegetarian'] },
  { id: '124', name: 'Tiffins Sustainable Fish', location: 'Tiffins Restaurant', park: 'Animal Kingdom', category: 'Meal', avgRating: 4.7, totalRatings: 423, description: 'Pan-seared sustainable fish with seasonal vegetables and African-spiced broth.', image: '🐟', price: '$$$', dietary: ['Gluten-Free'] },
  { id: '125', name: 'Tiffins Dessert Trio', location: 'Tiffins Restaurant', park: 'Animal Kingdom', category: 'Dessert', avgRating: 4.8, totalRatings: 389, description: 'Three rotating mini desserts showcasing global sweet traditions.', image: '🍮', price: '$$$', dietary: ['Vegetarian'] },
  { id: '126', name: 'Jungle Navigation Beverage', location: 'Nomad Lounge', park: 'Animal Kingdom', category: 'Drink', avgRating: 4.5, totalRatings: 567, description: 'Rotating craft cocktail inspired by worldwide travel.', image: '🍹', price: '$$', dietary: [] },
  { id: '127', name: 'African Beef Skewers', location: 'Nomad Lounge', park: 'Animal Kingdom', category: 'Snack', avgRating: 4.4, totalRatings: 423, description: 'Grilled beef skewers with chimichurri and African spice blend.', image: '🍢', price: '$$', dietary: ['Gluten-Free'] },
  { id: '128', name: 'Corn Dog', location: 'Upcountry Landing', park: 'Animal Kingdom', category: 'Snack', avgRating: 4.1, totalRatings: 389, description: 'Classic corn dog with dipping sauces.', image: '🌭', price: '$', dietary: [] },
  { id: '129', name: 'Dino Bite Milkshake', location: 'Restaurantosaurus', park: 'Animal Kingdom', category: 'Drink', avgRating: 4.2, totalRatings: 421, description: 'Colorful dinosaur-themed milkshake topped with gummy dinos.', image: '🦕', price: '$', dietary: ['Vegetarian'] },
  { id: '130', name: 'Cheeseburger', location: 'Restaurantosaurus', park: 'Animal Kingdom', category: 'Meal', avgRating: 4.0, totalRatings: 654, description: 'Classic smash-style cheeseburger with standard park toppings.', image: '🍔', price: '$', dietary: [] },
  { id: '131', name: 'Chicken Nuggets', location: 'Restaurantosaurus', park: 'Animal Kingdom', category: 'Meal', avgRating: 3.9, totalRatings: 543, description: 'Crispy chicken nuggets — the reliable kids option at Animal Kingdom.', image: '🍗', price: '$', dietary: [] },
  { id: '132', name: 'Carrot Cake', location: 'Restaurantosaurus', park: 'Animal Kingdom', category: 'Dessert', avgRating: 4.1, totalRatings: 312, description: 'Moist carrot cake with cream cheese frosting.', image: '🍰', price: '$', dietary: ['Vegetarian'] },
  { id: '133', name: 'Eight Spice Beef Bowl', location: "Satu'li Canteen", park: 'Animal Kingdom', category: 'Meal', avgRating: 4.5, totalRatings: 689, description: 'Charred eight-spice beef over quinoa and arugula with herb vinaigrette.', image: '🥩', price: '$$', dietary: ['Gluten-Free'] },
  { id: '134', name: 'Wood-Grilled Chicken Bowl', location: "Satu'li Canteen", park: 'Animal Kingdom', category: 'Meal', avgRating: 4.3, totalRatings: 567, description: 'Marinated wood-grilled chicken over rice noodles with pickled vegetables.', image: '🍚', price: '$$', dietary: ['Gluten-Free'] },
  { id: '135', name: 'Blueberry Cream Cheese Mousse', location: "Satu'li Canteen", park: 'Animal Kingdom', category: 'Dessert', avgRating: 4.4, totalRatings: 412, description: 'Light cream cheese mousse with blueberry compote and cookie crumble.', image: '🫐', price: '$', dietary: ['Vegetarian'] },
  { id: '136', name: 'Starbucks Cold Brew', location: 'Creature Comforts', park: 'Animal Kingdom', category: 'Drink', avgRating: 4.2, totalRatings: 534, description: 'Smooth Starbucks cold brew coffee.', image: '☕', price: '$', dietary: ['Vegan'] },
  { id: '137', name: 'Frappuccino', location: 'Creature Comforts', park: 'Animal Kingdom', category: 'Drink', avgRating: 4.1, totalRatings: 456, description: 'Blended Starbucks Frappuccino in your choice of flavor.', image: '🥤', price: '$', dietary: ['Vegetarian'] },
  { id: '138', name: 'Safari Popcorn', location: 'Various Carts', park: 'Animal Kingdom', category: 'Snack', avgRating: 4.0, totalRatings: 678, description: 'Freshly popped seasoned popcorn.', image: '🍿', price: '$', dietary: ['Vegan'] },
  { id: '139', name: 'Frozen Lemonade', location: 'Various Carts', park: 'Animal Kingdom', category: 'Drink', avgRating: 4.2, totalRatings: 534, description: 'Slushy frozen lemonade — essential on a hot Animal Kingdom day.', image: '🍋', price: '$', dietary: ['Vegan'] },
  { id: '140', name: 'Spring Rolls', location: "Mr. Kamal's", park: 'Animal Kingdom', category: 'Snack', avgRating: 4.2, totalRatings: 423, description: 'Crispy vegetable spring rolls served with sweet chili sauce.', image: '🥟', price: '$', dietary: ['Vegan'] },
  { id: '141', name: 'Seasoned Fries', location: "Mr. Kamal's", park: 'Animal Kingdom', category: 'Snack', avgRating: 4.0, totalRatings: 534, description: "Crispy fries seasoned with Mr. Kamal's signature spice blend.", image: '🍟', price: '$', dietary: ['Vegan'] },
  { id: '142', name: 'Grilled Corn', location: 'Various Carts', park: 'Animal Kingdom', category: 'Snack', avgRating: 4.1, totalRatings: 312, description: 'Grilled corn on the cob with seasoned butter.', image: '🌽', price: '$', dietary: ['Vegetarian', 'Gluten-Free'] },
  { id: '143', name: 'Baobab Smoothie', location: 'Harambe Fruit Market', park: 'Animal Kingdom', category: 'Drink', avgRating: 4.3, totalRatings: 289, description: 'Tropical smoothie made with African baobab fruit powder.', image: '🥤', price: '$', dietary: ['Vegan'] },
  { id: '144', name: 'Fresh Fruit Cup', location: 'Harambe Fruit Market', park: 'Animal Kingdom', category: 'Snack', avgRating: 4.0, totalRatings: 345, description: 'Seasonal fresh fruit cup.', image: '🍓', price: '$', dietary: ['Vegan', 'Gluten-Free'] },
  { id: '145', name: 'Naan Bread', location: 'Yak & Yeti Local Foods', park: 'Animal Kingdom', category: 'Snack', avgRating: 4.1, totalRatings: 289, description: 'Warm naan bread with garlic butter dipping sauce.', image: '🫓', price: '$', dietary: ['Vegetarian'] },
  { id: '146', name: 'Curry Bowl', location: 'Yak & Yeti Local Foods', park: 'Animal Kingdom', category: 'Meal', avgRating: 4.3, totalRatings: 412, description: 'Vegetable red curry with jasmine rice.', image: '🍛', price: '$', dietary: ['Vegan'] },
  { id: '147', name: 'Chocolate Lava Cake', location: 'Yak & Yeti Restaurant', park: 'Animal Kingdom', category: 'Dessert', avgRating: 4.6, totalRatings: 534, description: 'Warm chocolate lava cake with vanilla ice cream and caramel drizzle.', image: '🍫', price: '$$', dietary: ['Vegetarian'] },
  { id: '148', name: 'Lo Mein', location: 'Yak & Yeti Restaurant', park: 'Animal Kingdom', category: 'Meal', avgRating: 4.2, totalRatings: 423, description: 'Stir-fried lo mein noodles with vegetables and your choice of protein.', image: '🍜', price: '$$', dietary: [] },
  { id: '149', name: 'Pandora Sunrise', location: 'Pongu Pongu', park: 'Animal Kingdom', category: 'Drink', avgRating: 4.3, totalRatings: 356, description: 'Non-alcoholic tropical sunrise drink with layered orange and pink hues.', image: '🌅', price: '$', dietary: ['Vegan'] },
  { id: '150', name: 'Wilderness Explorer Trail Mix', location: 'Various Carts', park: 'Animal Kingdom', category: 'Snack', avgRating: 4.0, totalRatings: 234, description: 'Nuts, dried fruit and chocolate mix — perfect fuel between attractions.', image: '🥜', price: '$', dietary: ['Vegan', 'Gluten-Free'] },
];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #7C3AED, #2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: 24 }}>Loading…</div>
      </div>
    );
  }

  if (showAuth) {
    return <AuthScreen onSignIn={handleSignIn} onSignUp={handleSignUp} />;
  }
return (
    <Routes>
      <Route path="/profile" element={<ProfilePage currentUser={currentUser} />} />
      <Route path="/" element={
        <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
          <Header onSignOut={handleSignOut} />
          <MainContent
            items={items}
            currentUser={currentUser}
            onRate={handleRate}
            userRatings={userRatings}
            userLikes={userLikes}
            wantToTry={wantToTry}
            parks={parks}
            categories={categories}
            priceRanges={priceRanges}
          />
        </div>
      } />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<MainApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;