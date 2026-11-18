import type { Metadata } from 'next';
import { AuthPageShell } from '@/components/layout/AuthPageShell';
export const metadata: Metadata = { title: 'Cadastrar' };
export default function RegisterPage() { return <AuthPageShell mode="register" />; }
