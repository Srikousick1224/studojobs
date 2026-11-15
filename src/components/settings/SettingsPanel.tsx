"use client";

import { Bell, KeyRound, Palette, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AppearanceSettings } from "@/components/features/AppearanceSettings";
import { ChipGroup, ResultNote, SaveBar, SettingsCard, SwitchRow, useAction } from "@/components/settings/controls";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import { PasswordField } from "@/components/ui/PasswordField";
import { changeEmailAction, changePasswordAction, savePreferencesAction, signOutEverywhereAction, updateAccountAction } from "@/lib/settings/actions";
import {
  AVAILABILITY, AVAILABILITY_LABEL, DIGESTS, DIGEST_LABEL, JOB_TYPES, JOB_TYPE_LABEL, WORK_MODES, WORK_MODE_LABEL,
  type EmployerSettings, type StudentSettings,
} from "@/lib/settings/schema";
import { cn } from "@/lib/utils";

type Notifications = StudentSettings["notifications"];
interface Common { fullName: string; email: string; phone: string; usesPassword: boolean; preferencesReady: boolean }
type Props = (Common & { role: "student"; settings: StudentSettings }) | (Common & { role: "employer"; settings: EmployerSettings });

const TABS = [
  { id: "account", label: "Account", icon: UserRound },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "appearance", label: "Appearance", icon: Palette },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function SettingsPanel(props: Props) {
  const [tab, setTab] = useState<TabId>("account");
  const p = usePrefs(props);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKey(e: KeyboardEvent, i: number) {
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const t = TABS[(next + TABS.length) % TABS.length];
    setTab(t.id);
    refs.current[t.id]?.focus();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <div role="tablist" aria-label="Settings sections" aria-orientation="vertical" className="flex gap-1 overflow-x-auto pb-1 lg:sticky lg:top-6 lg:flex-col lg:self-start lg:overflow-visible">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { refs.current[t.id] = el; }}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn("nav-link flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold",
              tab === t.id ? "bg-brand-500 text-white shadow-soft" : "text-ink-600 hover:bg-white hover:text-ink-900")}
          >
            <t.icon className="h-4.5 w-4.5" aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>

      <div key={tab} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0} className="panel-in min-w-0 space-y-6 focus-visible:outline-none">
        {tab === "account" && <AccountTab {...props} />}
        {tab === "notifications" && <NotificationsTab {...props} p={p} />}
        {tab === "preferences" && <PreferencesTab {...props} p={p} />}
        {tab === "security" && <SecurityTab {...props} />}
        {tab === "appearance" && <AppearanceSettings />}
      </div>
    </div>
  );
}

function AccountTab({ fullName, email, phone, role }: Props) {
  const [name, setName] = useState(fullName);
  const [tel, setTel] = useState(phone);
  const { pending, result, run } = useAction();
  const router = useRouter();
  function submit(e: FormEvent) {
    e.preventDefault();
    run(() => updateAccountAction({ fullName: name, phone: tel }), (r) => r.ok && router.refresh());
  }
  return (
    <SettingsCard title="Your details" text={role === "student" ? "Your name appears on applications. Education and skills live on your Profile page." : "Your name is shown to students you contact. Company details live on the Company page."}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="s-name" label="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          <Input id="s-phone" label="Phone (optional)" value={tel} onChange={(e) => setTel(e.target.value)} autoComplete="tel" inputMode="tel" hint="Only used if you choose to share it." />
        </div>
        <Input id="s-email" label="Email" value={email} readOnly aria-readonly="true" hint="Change your email in the Security tab." className="bg-ink-50" />
        <ResultNote result={result} />
        <SaveBar pending={pending} />
      </form>
    </SettingsCard>
  );
}

const NOTIFY: { key: keyof Omit<Notifications, "digest">; label: string; text: string }[] = [
  { key: "applicationUpdates", label: "Application updates", text: "When an application is reviewed, shortlisted or decided." },
  { key: "interviewReminders", label: "Interview reminders", text: "A reminder before every scheduled interview." },
  { key: "newMatches", label: "New matches", text: "Roles that fit your skills and preferences." },
  { key: "community", label: "Community replies", text: "Comments on your posts." },
  { key: "product", label: "Product news", text: "New StudoJob features and tips. Rare." },
];
const NOTIFY_EMPLOYER = [
  { key: "applicationUpdates" as const, label: "New applicants", text: "When a student applies to one of your roles." },
  { key: "interviewReminders" as const, label: "Interview reminders", text: "A reminder before every scheduled interview." },
  { key: "community" as const, label: "Community replies", text: "Comments on your posts." },
  { key: "product" as const, label: "Product news", text: "New StudoJob features and tips. Rare." },
];

function NotReady({ ready }: { ready: boolean }) {
  if (ready) return null;
  return <Notice tone="warn">Saving preferences needs database migration 012 (<code>supabase/proposed/20261115000012_user_settings.sql</code>). You can change the switches, but they will not be stored until it is applied.</Notice>;
}

/** One state for the whole stored row (notifications + preferences), lifted to the panel so edits survive tab switches and each save sends both halves. */
function usePrefs(props: Props) {
  const [notifications, setNotifications] = useState<Notifications>(props.settings.notifications);
  const [prefs, setPrefs] = useState(props.settings.prefs);
  const act = useAction();
  const save = (e?: FormEvent) => { e?.preventDefault(); act.run(() => savePreferencesAction({ notifications, prefs })); };
  return { notifications, setNotifications, prefs, setPrefs, ...act, save };
}
type Prefs = ReturnType<typeof usePrefs>;

function NotificationsTab(props: Props & { p: Prefs }) {
  const p = props.p;
  const items = props.role === "student" ? NOTIFY : NOTIFY_EMPLOYER;
  return (
    <SettingsCard title="Notifications" text="Choose what StudoJob tells you about.">
      <NotReady ready={props.preferencesReady} />
      <form onSubmit={p.save} className="space-y-2">
        <div className="divide-y divide-ink-100">
          {items.map((n) => (
            <SwitchRow key={n.key} label={n.label} text={n.text} checked={p.notifications[n.key]} onChange={(v) => p.setNotifications({ ...p.notifications, [n.key]: v })} />
          ))}
          {props.role === "employer" && (
            <SwitchRow label="Email me for every applicant" text="One email per new application, instead of waiting for the summary." checked={(p.prefs as EmployerSettings["prefs"]).emailEachApplicant} onChange={(v) => p.setPrefs({ ...(p.prefs as EmployerSettings["prefs"]), emailEachApplicant: v })} />
          )}
        </div>
        <div className="max-w-xs pt-2">
          <Select id="digest" label="Summary email" value={p.notifications.digest} onChange={(e) => p.setNotifications({ ...p.notifications, digest: e.target.value as Notifications["digest"] })}>
            {DIGESTS.map((d) => <option key={d} value={d}>{DIGEST_LABEL[d]}</option>)}
          </Select>
        </div>
        <p className="text-xs text-ink-500">Your choices are saved to your account. Emails go out only once email sending is connected for StudoJob.</p>
        <ResultNote result={p.result} />
        <SaveBar pending={p.pending} />
      </form>
    </SettingsCard>
  );
}

function PreferencesTab(props: Props & { p: Prefs }) {
  const p = props.p;
  if (props.role === "student") {
    const s = p.prefs as StudentSettings["prefs"];
    const set = (patch: Partial<StudentSettings["prefs"]>) => p.setPrefs({ ...s, ...patch });
    return (
      <form onSubmit={p.save} className="space-y-6">
        <NotReady ready={props.preferencesReady} />
        <SettingsCard title="Job preferences" text="Tell us what you are looking for. We use this to tailor recommendations.">
          <ChipGroup legend="Types of opportunity" options={JOB_TYPES.map((v) => ({ value: v, label: JOB_TYPE_LABEL[v] }))} value={s.jobTypes} onChange={(v) => set({ jobTypes: v })} />
          <ChipGroup legend="Work style" options={WORK_MODES.map((v) => ({ value: v, label: WORK_MODE_LABEL[v] }))} value={s.workModes} onChange={(v) => set({ workModes: v })} />
          <div className="max-w-xs">
            <Select id="avail" label="When can you start?" value={s.availability} onChange={(e) => set({ availability: e.target.value as StudentSettings["prefs"]["availability"] })}>
              {AVAILABILITY.map((a) => <option key={a} value={a}>{AVAILABILITY_LABEL[a]}</option>)}
            </Select>
          </div>
        </SettingsCard>
        <SettingsCard title="Privacy" text="Control what employers can see.">
          <div className="divide-y divide-ink-100">
            <SwitchRow label="Open to opportunities" text="Shows a green badge on your profile." checked={s.openToWork} onChange={(v) => set({ openToWork: v })} />
            <SwitchRow label="Visible to employers" text="Let verified employers find your profile." checked={s.visibleToEmployers} onChange={(v) => set({ visibleToEmployers: v })} />
            <SwitchRow label="Show my college" text="Display your college and degree on your profile." checked={s.showCollege} onChange={(v) => set({ showCollege: v })} />
          </div>
          <p className="text-xs text-ink-500">Employers currently see a profile only when you apply to their role. These choices are stored now and will control search visibility when employer search launches.</p>
          <ResultNote result={p.result} />
          <SaveBar pending={p.pending} />
        </SettingsCard>
      </form>
    );
  }
  const e = p.prefs as EmployerSettings["prefs"];
  const set = (patch: Partial<EmployerSettings["prefs"]>) => p.setPrefs({ ...e, ...patch });
  return (
    <form onSubmit={p.save} className="space-y-6">
      <NotReady ready={props.preferencesReady} />
      <SettingsCard title="Hiring defaults" text="Pre-fill the “Post a role” form so posting takes seconds.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select id="djt" label="Default opportunity type" value={e.defaultJobType} onChange={(ev) => set({ defaultJobType: ev.target.value as EmployerSettings["prefs"]["defaultJobType"] })}>
            {JOB_TYPES.map((v) => <option key={v} value={v}>{JOB_TYPE_LABEL[v]}</option>)}
          </Select>
          <Select id="dwm" label="Default work style" value={e.defaultWorkMode} onChange={(ev) => set({ defaultWorkMode: ev.target.value as EmployerSettings["prefs"]["defaultWorkMode"] })}>
            {WORK_MODES.map((v) => <option key={v} value={v}>{WORK_MODE_LABEL[v]}</option>)}
          </Select>
        </div>
      </SettingsCard>
      <SettingsCard title="Applicant auto-reply" text="A friendly acknowledgement students can count on.">
        <SwitchRow label="Send an auto-reply" text="Students see this message after they apply." checked={e.autoReply} onChange={(v) => set({ autoReply: v })} />
        {e.autoReply && (
          <Textarea id="autoreply" label="Message" value={e.autoReplyText} maxLength={500} onChange={(ev) => set({ autoReplyText: ev.target.value })} hint={`${e.autoReplyText.length}/500`} />
        )}
        <p className="text-xs text-ink-500">Saved to your account now. The message is delivered once email sending is connected.</p>
        <ResultNote result={p.result} />
        <SaveBar pending={p.pending} />
      </SettingsCard>
    </form>
  );
}

function SecurityTab({ email, usesPassword }: Props) {
  const router = useRouter();
  const pw = useAction();
  const em = useAction();
  const out = useAction();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [newEmail, setNewEmail] = useState("");

  return (
    <>
      <SettingsCard title="Password" text={usesPassword ? "Use at least 8 characters with a letter and a number." : undefined}>
        {usesPassword ? (
          <form
            onSubmit={(e) => { e.preventDefault(); pw.run(() => changePasswordAction({ password, confirmPassword: confirm }), (r) => { if (r.ok) { setPassword(""); setConfirm(""); } }); }}
            className="max-w-md space-y-4" noValidate
          >
            <PasswordField id="np" label="New password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <PasswordField id="cp" label="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            <ResultNote result={pw.result} />
            <SaveBar pending={pw.pending} label="Change password" />
          </form>
        ) : (
          <Notice>You sign in with Google, so there is no StudoJob password to change. Manage it in your Google account.</Notice>
        )}
      </SettingsCard>

      <SettingsCard title="Email address" text={`Currently ${email}. We email a confirmation link to the new address.`}>
        <form onSubmit={(e) => { e.preventDefault(); em.run(() => changeEmailAction({ email: newEmail }), (r) => r.ok && setNewEmail("")); }} className="max-w-md space-y-4" noValidate>
          <Input id="ne" type="email" label="New email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="email" />
          <ResultNote result={em.result} />
          <SaveBar pending={em.pending} label="Send confirmation" />
        </form>
      </SettingsCard>

      <SettingsCard title="Devices" text="Lost a phone or used a shared computer? Sign out everywhere, then log in again here.">
        <ResultNote result={out.result} />
        <Button variant="secondary" disabled={out.pending} onClick={() => out.run(signOutEverywhereAction, (r) => r.ok && router.push("/login"))}>
          <KeyRound className="h-4 w-4" aria-hidden="true" /> Sign out on all devices
        </Button>
      </SettingsCard>

      <SettingsCard danger title="Delete account" text="Deleting an account removes your profile, applications and saved items for good.">
        <Button href="/contact" variant="secondary" className="text-rose-700">Contact us to delete my account</Button>
      </SettingsCard>
    </>
  );
}
