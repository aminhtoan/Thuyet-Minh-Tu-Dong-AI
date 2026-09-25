import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { RegisterForm } from '../features/auth/RegisterForm'

export function RegisterPlaceholder() {
  return <AuthLayout title="Create your account" description="Start building multilingual narration projects." footer={<>Already have an account? <Link to="/login">Sign in</Link></>}><RegisterForm /></AuthLayout>
}
