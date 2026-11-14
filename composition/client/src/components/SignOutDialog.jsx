import AppDialog from './AppDialog.jsx'

// The sign-out confirmation: the app's standard window (components/AppDialog.jsx).
const SignOutDialog = ({ open, onConfirm, onCancel }) => (open
  ? <AppDialog title="Sign out?" message="Are you sure you want to sign out of the Learning Plan System?"
      confirmLabel="Sign out" cancelLabel="Cancel" onDone={(ok) => (ok ? onConfirm() : onCancel())} />
  : null)

export default SignOutDialog
