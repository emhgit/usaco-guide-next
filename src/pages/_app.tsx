import "../styles/main.css";
import type { AppProps } from "next/app";
import GlobalErrorBoundary from "../context/GlobalErrorBoundary";
import { FirebaseProvider } from "../context/FirebaseContext";
import { UserDataProvider } from "../context/UserDataContext/UserDataContext";
import { DarkModeProvider } from "../context/DarkModeProvider";
import { SignInProvider } from "../context/SignInContext";
import { UserGroupsProvider } from "../hooks/groups/useUserGroups";
import { EditorContext } from "../context/EditorContext";
import { Toaster } from "react-hot-toast";
import { BlindModeProvider } from "../context/BlindModeContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <GlobalErrorBoundary>
        <FirebaseProvider>
          <UserDataProvider>
            <DarkModeProvider>
              <SignInProvider>
                <UserGroupsProvider>
                  <BlindModeProvider>
                    <EditorContext.Provider value={{ inEditor: false }}>
                      <Component {...pageProps} />
                    </EditorContext.Provider>
                  </BlindModeProvider>
                </UserGroupsProvider>
              </SignInProvider>
            </DarkModeProvider>
          </UserDataProvider>
        </FirebaseProvider>
      </GlobalErrorBoundary>
      <Toaster position="top-right" />
    </>
  );
}
