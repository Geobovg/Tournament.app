import { LoginForm } from "@/components/auth-forms";
export default function LoginPage() { return <div className="mx-auto grid min-h-[calc(100dvh-8rem)] max-w-md content-center gap-5"><div><h1 className="text-2xl font-semibold">Logg inn</h1><p className="text-muted">Bruk din personlige sekssifrede kode.</p></div><LoginForm /></div>; }
