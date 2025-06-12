
function LoginPage() {
  return (
    <div className="container">
      <header>
        <h1>Cloudflare SaaS Example</h1>
      </header>
      
      <div className="section">
        <h2>Welcome</h2>
        <p>This example demonstrates Better Auth with Durable Objects for per-user data isolation.</p>
        
        <div className="auth-buttons">
          <a href="/auth/sign-in/social?provider=github" className="auth-button github">
            Login with GitHub
          </a>
          <a href="/auth/sign-in/social?provider=google" className="auth-button google">
            Login with Google
          </a>
        </div>
        
        <p style={{ marginTop: '30px' }}>
          After logging in, you'll have access to your isolated data stored in a Durable Object.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;