import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react'
import {environmentManager, Environment, EnvironmentConfig} from '@/lib/environment'

interface EnvironmentContextType {
  environment: Environment
  config: EnvironmentConfig
  setEnvironment: (env: Environment) => Promise<void>
  canSwitch: boolean
  allEnvironments: EnvironmentConfig[]
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined)

export function EnvironmentProvider({children}: {children: ReactNode}) {
  const [environment, setEnvironmentState] = useState<Environment>(
    environmentManager.getCurrentEnvironment()
  )
  const [config, setConfig] = useState<EnvironmentConfig>(environmentManager.getCurrentConfig())

  useEffect(() => {
    environmentManager.initialize().then(() => {
      setEnvironmentState(environmentManager.getCurrentEnvironment())
      setConfig(environmentManager.getCurrentConfig())
    })
  }, [])

  const setEnvironment = async (env: Environment) => {
    await environmentManager.setEnvironment(env)
    setEnvironmentState(env)
    setConfig(environmentManager.getCurrentConfig())
  }

  return (
    <EnvironmentContext.Provider
      value={{
        environment,
        config,
        setEnvironment,
        canSwitch: environmentManager.canSwitchEnvironment(),
        allEnvironments: environmentManager.getAllEnvironments(),
      }}
    >
      {children}
    </EnvironmentContext.Provider>
  )
}

export function useEnvironment() {
  const context = useContext(EnvironmentContext)
  if (context === undefined) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider')
  }
  return context
}
