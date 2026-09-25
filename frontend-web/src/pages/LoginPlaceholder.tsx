import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { LoginForm } from '../features/auth/LoginForm'

export function LoginPlaceholder() {
  return <AuthLayout title="Welcome back" description="Sign in to continue to your narration workspace." footer={<>Don't have an account? <Link to="/register">Create account</Link></>}><LoginForm /></AuthLayout>
}
