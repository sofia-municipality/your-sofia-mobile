import {createContext, useContext, useState, ReactNode, useCallback} from 'react'

interface BellActionContextType {
  triggerBellAction: () => void
  registerBellAction: (action: () => void) => void
}

const BellActionContext = createContext<BellActionContextType>({
  triggerBellAction: () => {},
  registerBellAction: () => {},
})

export function useBellAction() {
  return useContext(BellActionContext)
}

interface BellActionProviderProps {
  children: ReactNode
}

export function BellActionProvider({children}: BellActionProviderProps) {
  const [bellAction, setBellAction] = useState<(() => void) | null>(null)

  const registerBellAction = useCallback((action: () => void) => {
    setBellAction(() => action)
  }, [])

  const triggerBellAction = useCallback(() => {
    if (bellAction) {
      bellAction()
    }
  }, [bellAction])

  return (
    <BellActionContext.Provider value={{triggerBellAction, registerBellAction}}>
      {children}
    </BellActionContext.Provider>
  )
}
