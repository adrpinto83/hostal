import React from "react";
import Header from "@/components/Header";

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="py-6">{children}</main>
    </div>
  );
};

export default AppLayout;
