import AppDialog from './AppDialog.jsx';

const SignOutDialog = ({ open, onConfirm, onCancel }) =>
  open ? (
    <AppDialog
      title="Sign out?"
      message="Are you sure you want to sign out of the Learning Plan Management System?"
      confirmLabel="Sign out"
      cancelLabel="Cancel"
      danger
      onDone={(ok) => (ok ? onConfirm() : onCancel())}
    />
  ) : null;

export default SignOutDialog;
