import React from 'react';

const App: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f9fafb',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '2.25rem', color: '#1f2937', fontWeight: 'bold' }}>
        Successfully Deployed to GitHub Pages!
      </h1>
    </div>
  );
};

export default App;
