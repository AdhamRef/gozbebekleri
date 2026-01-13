import {useState} from 'react';


export const Menu = ({children}) => {
    const [isOpen,setIsOpen] = useState(false);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    }


    return (
        <div style={{padding:10,borderBottomWidth: 1, borderStyle: 'solid', borderColor: '#DEDEDE',}}>
            {typeof children === 'function'
            ? children({ isOpen, toggleMenu })
            : children}
        </div>
    )
 }