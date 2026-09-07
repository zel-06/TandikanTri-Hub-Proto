const STEP_LABELS = ['Personal Details', 'Agreements', 'Payment', 'Confirmation'];

export default function RegistrationSteps({ currentStep }) {
  return (
    <div className="register-steps register-steps-4">
      {STEP_LABELS.map((label, i) => {
        const stepNumber = i + 1;
        const complete = stepNumber < currentStep;
        const active = stepNumber === currentStep;
        return (
          <div key={label} className={`step${active ? ' active' : ''}${complete ? ' complete' : ''}`}>
            <span>{complete ? '✓' : stepNumber}</span>
            <p>{label}</p>
          </div>
        );
      })}
    </div>
  );
}
