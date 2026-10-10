import React from "react";
import {ConnectionProvider} from "./ConnectionProvider.jsx";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConnectionProvider><App /></ConnectionProvider>
  </React.StrictMode>,
);
import './material-theme.css';

import "./df-theme.css";
