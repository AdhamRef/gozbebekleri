import { BsBorderStyle } from "react-icons/bs"

export const MenuButton = ({ toggleMenu, isOpen, children, className, icon, style = {}, ...rest }) => {
    return (
        <button className={className} onClick={toggleMenu} style={{...defaultStyle,...style}} {...rest}>
            {icon && (<div>{icon}</div>)}
            <span style={{fontWeight:700,fontSize:18}}>{children}</span>
            {/*<span style={{marginLeft:10}}> {isOpen ? '▲' : '▼'}</span>*/}
        </button>
    )
}

const defaultStyle = {
    cursor: 'pointer',
    display:'flex',
    flexDirection: 'row',
    alignItems:'center',
    gap:10,
}