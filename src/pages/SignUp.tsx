import AuthForm from '@/components/login-form';

export default function SignUp() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <AuthForm initialMode="signup" />
    </main>
  );
}
