import type { Metadata } from 'next';
import { AuthPageShell } from '@/components/layout/AuthPageShell';
export const metadata: Metadata = { title: 'Entrar' };
export default function LoginPage() { return <AuthPageShell mode="login" />; }
