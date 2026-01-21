export function Toast({ show, message, type }) {
  return (
    <div className={`toast ${show ? 'show' : ''} ${type}`}>
      <span>{message}</span>
    </div>
  );
}
