import React from "react";
import Form from "./components/Form";
import Admin from "./components/Admin";
import StudentDetail from "./components/StudentDetail";

const App = () => {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";

  // Handle student detail route
  if (path.startsWith("/student/")) {
    const studentId = path.split("/student/")[1];
    return (
      <div>
        <StudentDetail studentId={studentId} />
      </div>
    );
  }

  if (path === "/admin") {
    return (
      <div>
        <Admin />
      </div>
    );
  }

  return (
    <div>
      <Form />
    </div>
  );
};

export default App;
