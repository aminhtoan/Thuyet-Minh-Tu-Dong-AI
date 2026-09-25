import { useState } from 'react'
import type { ComponentProps } from 'react'
import { Icon } from '../../components/common/Icon'
import { Input } from '../../components/common/Input'

type PasswordFieldProps = Omit<ComponentProps<typeof Input>, 'type' | 'suffix'>

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const label = visible ? 'Hide password' : 'Show password'
  return <Input {...props} type={visible ? 'text' : 'password'} suffix={<button className="password-toggle" type="button" onClick={() => setVisible((current) => !current)} aria-label={label} title={label}><Icon name={visible ? 'eyeOff' : 'eye'} width="20" /></button>} />
}
