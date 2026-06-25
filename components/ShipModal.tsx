'use client'

export default function ShipModal({ order, onClose, onConfirm }: any) {
  return (
    <div style={overlay}>
      <div style={modal}>
        <h3 style={{ fontSize: 18, fontWeight: 500, marginBottom: 12 }}>🚛 確認出貨</h3>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 12 }}>確認後此訂單將移至今日出貨並記錄時間。</p>
        <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 15, color: '#333', lineHeight: 2 }}>
          <b style={{ fontSize: 17 }}>{order.customer}</b><br />
          品項：<b>{order.item}</b>{order.qty ? ` × ${order.qty}` : ''}
          {order.process && <><br />⚙ {order.process}</>}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnCancel}>取消</button>
          <button onClick={onConfirm} style={btnConfirm}>🚛 確認出貨</button>
        </div>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 14 }
const modal: React.CSSProperties = { background: '#fff', borderRadius: 12, border: '0.5px solid #ddd', padding: 20, width: '100%', maxWidth: 480, color: '#1a1a1a' }
const btnConfirm: React.CSSProperties = { fontSize: 16, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#639922', color: '#fff', cursor: 'pointer', fontWeight: 500 }
const btnCancel: React.CSSProperties = { fontSize: 14, padding: '8px 18px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', color: '#555', cursor: 'pointer' }
