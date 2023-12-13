import { useState, useEffect } from 'react';
import { css } from '@emotion/css'
import { XIcon } from "../icons";

const Modal = ({ open, onClose, children, style: { backgroundColor, color } }) => {
  const [display, setDisplay] = useState(false);

  useEffect(() => {
    if (open) {
      setDisplay(true);
    }
  }, [open]);

  const closeModal = () => {
    setDisplay(false);
    onClose();
  };

  if (!display) {
    return null;
  }

  return (
    <div className={modalStyle(display)} onClick={closeModal}>
      <div className={modalContentStyle(backgroundColor, color)} onClick={e => e.stopPropagation()}>
        <button className={closeButtonStyle} onClick={closeModal}>
          <XIcon color={color} aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>
  );
};

const TRANSITION = {
  enter: "ease-out",
  enterDuration: "300ms",
  enterFrom: "0",
  enterTo: "1",
  leave: "ease-in",
  leaveDuration: "200ms",
  leaveFrom: "1",
  leaveTo: "0"
};

const modalStyle = (display: boolean) => css`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: ${display ? TRANSITION.enterTo : TRANSITION.leaveTo};
  transition: opacity ${display ? TRANSITION.enterDuration : TRANSITION.leaveDuration} ${display ? TRANSITION.enter : TRANSITION.leave};
  z-index: 10;
  overflow-y: auto;
  cursor: default;
`;

const modalContentStyle = (backgroundColor, color) => css`
  background-color: ${backgroundColor};
  color: ${color};
  width: 75vh;
  height: auto;
  color: var(--color-secondary);
  position: relative;
  border-radius: 0.25rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transform: scale(1);
  transition: all 0.2s ease-in-out;
  margin-top: 2rem;
  padding: 1rem;
  @media (max-width: 768px) {
    height: auto;
    width: 95%;
  }
`;

const closeButtonStyle = css`
  position: absolute;
  top: 1rem;
  right: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  height: 1.75rem;
  width: 1.75rem;
`;

export default Modal;