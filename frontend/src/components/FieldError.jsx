const FieldError = ({ error }) => {
  if (!error) return null;
  return (
    <span
      style={{
        color: "#e74c3c",
        fontSize: "0.8rem",
        marginTop: "0.25rem",
        display: "block",
      }}
    >
      ⚠ {error}
    </span>
  );
};

export default FieldError;
