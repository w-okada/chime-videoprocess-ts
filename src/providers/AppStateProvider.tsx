import React, { useState, ReactNode, useContext } from 'react';

type Props = {
    children: ReactNode;
};

interface AppStateValue {
    audioInput: string|null,
    videoInput: string|MediaStream|null,
    audioOutput: string|null,
    setAudioInput: (val:string | null) => void
    setVideoInput: (val:string | MediaStream | null) => void
    setAudioOutput: (val:string | null) => void



}

const AppStateContext = React.createContext<AppStateValue | null>(null)


export const useAppState = (): AppStateValue => {
    const state = useContext(AppStateContext)
    if (!state) {
        throw new Error("Error using app state context!")
    }
    return state
}


export const AppStateProvider = ({ children }: Props) => {
    const [audioInput, setAudioInput]   = useState(null as string|null)
    const [videoInput, setVideoInput]   = useState(null as string|MediaStream|null)
    const [audioOutput, setAudioOutput] = useState(null as string|null)

    const providerValue:AppStateValue = {
        audioInput: audioInput,
        videoInput: videoInput,
        audioOutput: audioOutput,
        setAudioInput: setAudioInput,
        setVideoInput: setVideoInput,
        setAudioOutput: setAudioOutput,

    }

    return (
        <AppStateContext.Provider value={providerValue}>
            {children}
        </AppStateContext.Provider>
    )
}