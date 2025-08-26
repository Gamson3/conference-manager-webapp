"use client";

import StoreProvider from "@/state/redux"; 
import { Authenticator } from "@aws-amplify/ui-react";
import Auth from "./(auth)/authProvider";
import { AuthProvider } from "./(auth)/authContext";

const Providers = ({ children } : { children: React.ReactNode }) => {
    return (
        <StoreProvider>
            <Authenticator.Provider>
                <Auth>
                    <AuthProvider>
                        {children}
                    </AuthProvider>
                </Auth>
            </Authenticator.Provider>
        </StoreProvider>
    )
}

export default Providers;