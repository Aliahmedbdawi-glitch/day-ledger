import { useState } from 'react';
import { useStore, useSortedCatalog } from '../data/store';

function clampPoints(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-100, Math.min(100, Math.round(value)));
}

export function ActivitiesPage() {
  const {
    data,
    seedExampleData,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategory,
    addActivity,
    updateActivity,
    deleteActivity,
    reorderActivity,
  } = useStore();
  const { categories, activities } = useSortedCatalog(data);

  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📁');
  const [newCatColor, setNewCatColor] = useState('#8A867C');

  // Auto-register may already have created Health › Sleep, so offer the example set until it's been loaded once.
  const empty = !data.settings.seeded && activities.length <= 1;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Activities</h1>
      </div>

      <p className="muted" style={{ marginTop: 0 }}>
        Points are earned per hour. Use <strong className="pts-pos">+</strong> for time well spent and{' '}
        <strong className="pts-neg">−</strong> for time you want less of (e.g. scrolling).
      </p>

      {empty && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <p style={{ marginTop: 0 }}>Add categories and activities you use when logging time.</p>
          <button type="button" className="btn btn-primary" onClick={seedExampleData}>
            Load example set
          </button>
        </div>
      )}

      <div className="card list-section">
        <h3 style={{ marginTop: 0 }}>Add category</h3>
        <div className="form-row">
          <label>
            Name
            <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
          </label>
          <label>
            Icon
            <input value={newCatIcon} onChange={(e) => setNewCatIcon(e.target.value)} style={{ width: '4rem' }} />
          </label>
          <label>
            Color
            <input type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)} />
          </label>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (!newCatName.trim()) return;
              addCategory({ name: newCatName.trim(), icon: newCatIcon, color: newCatColor });
              setNewCatName('');
            }}
          >
            Add category
          </button>
        </div>
      </div>

      {categories.map((cat) => {
        const acts = activities.filter((a) => a.categoryId === cat.id);
        return (
          <div key={cat.id} className="card category-block">
            <div className="category-head">
              <div>
                <span style={{ marginRight: '0.35rem' }}>{cat.icon}</span>
                <input
                  value={cat.name}
                  onChange={(e) => updateCategory(cat.id, { name: e.target.value })}
                  style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: '1rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => reorderCategory(cat.id, 'up')}>
                  ↑
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => reorderCategory(cat.id, 'down')}>
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    if (confirm(`Delete category "${cat.name}" and its activities?`)) {
                      deleteCategory(cat.id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="form-row">
              <label>
                Color
                <input
                  type="color"
                  value={cat.color}
                  onChange={(e) => updateCategory(cat.id, { color: e.target.value })}
                />
              </label>
              <label>
                Icon
                <input
                  value={cat.icon}
                  onChange={(e) => updateCategory(cat.id, { icon: e.target.value })}
                  style={{ width: '4rem' }}
                />
              </label>
            </div>

            {acts.map((act) => (
              <div key={act.id} className="activity-line">
                <input
                  className="activity-name"
                  value={act.name}
                  aria-label={`${act.name} name`}
                  onChange={(e) => updateActivity(act.id, { name: e.target.value })}
                />
                <div className="activity-controls">
                  <button
                    type="button"
                    className={`btn sign-toggle ${act.points < 0 ? 'is-neg' : 'is-pos'}`}
                    title="Flip between gaining and losing points"
                    onClick={() => updateActivity(act.id, { points: -act.points })}
                  >
                    {act.points < 0 ? '−' : '+'}
                  </button>
                  <label className="muted activity-points">
                    <input
                      type="number"
                      min={-100}
                      max={100}
                      value={act.points}
                      onChange={(e) => updateActivity(act.id, { points: clampPoints(Number(e.target.value)) })}
                      aria-label={`${act.name} points per hour`}
                    />
                    pts/h
                  </label>
                  <button type="button" className="btn btn-ghost" onClick={() => reorderActivity(cat.id, act.id, 'up')}>
                    ↑
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => reorderActivity(cat.id, act.id, 'down')}>
                    ↓
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => deleteActivity(act.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="btn"
              style={{ marginTop: '0.5rem' }}
              onClick={() => {
                const name = prompt('Activity name');
                if (!name?.trim()) return;
                const raw = prompt('Points per hour (-100 to 100, negative = loses points)', '0');
                addActivity(cat.id, name.trim(), clampPoints(Number(raw) || 0));
              }}
            >
              + Add activity
            </button>
          </div>
        );
      })}

      {!empty && categories.length === 0 && (
        <p className="empty-hint">No categories yet.</p>
      )}
    </div>
  );
}
