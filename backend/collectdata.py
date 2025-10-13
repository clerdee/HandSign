# collectdata.py    
import os
import cv2
cap=cv2.VideoCapture(0)
directory='Image'
while True:
    _,frame=cap.read()
    count = {
             'a': len(os.listdir(directory+"/A")),
             'b': len(os.listdir(directory+"/B")),
             'c': len(os.listdir(directory+"/C")),
             'd': len(os.listdir(directory+"/D")),
             'e': len(os.listdir(directory+"/E")),
             'f': len(os.listdir(directory+"/F")),
             'g': len(os.listdir(directory+"/G")),
             'h': len(os.listdir(directory+"/H")),
             'i': len(os.listdir(directory+"/I")),
             'j': len(os.listdir(directory+"/J")),
             'k': len(os.listdir(directory+"/K")),
             'l': len(os.listdir(directory+"/L")),
             'm': len(os.listdir(directory+"/M")),
             'n': len(os.listdir(directory+"/N")),
             'o': len(os.listdir(directory+"/O")),
             'p': len(os.listdir(directory+"/P")),
             'q': len(os.listdir(directory+"/Q")),
             'r': len(os.listdir(directory+"/R")),
             's': len(os.listdir(directory+"/S")),
             't': len(os.listdir(directory+"/T")),
             'u': len(os.listdir(directory+"/U")),
             'v': len(os.listdir(directory+"/V")),
             'w': len(os.listdir(directory+"/W")),
             'x': len(os.listdir(directory+"/X")),
             'y': len(os.listdir(directory+"/Y")),
             'z': len(os.listdir(directory+"/Z"))
             }
    row = frame.shape[1]
    col = frame.shape[0]
    cv2.rectangle(frame, (50, 50), (590, 430), (255, 255, 255), 2)
    cv2.imshow("data",frame)
    cv2.imshow("ROI",frame[40:400,0:300])
    frame=frame[40:400,0:300]
    interrupt = cv2.waitKey(10)
    if interrupt & 0xFF == ord('a'):
        cv2.imwrite(os.path.join(directory, 'A', f"{count['a']}.png"), frame)
    if interrupt & 0xFF == ord('b'):
        cv2.imwrite(os.path.join(directory, 'B', f"{count['b']}.png"), frame)
    if interrupt & 0xFF == ord('c'):
        cv2.imwrite(os.path.join(directory, 'C', f"{count['c']}.png"), frame)
    if interrupt & 0xFF == ord('d'):
        cv2.imwrite(os.path.join(directory, 'D', f"{count['d']}.png"), frame)
    if interrupt & 0xFF == ord('e'):
        cv2.imwrite(os.path.join(directory, 'E', f"{count['e']}.png"), frame)
    if interrupt & 0xFF == ord('f'):
        cv2.imwrite(os.path.join(directory, 'F', f"{count['f']}.png"), frame)
    if interrupt & 0xFF == ord('g'):
        cv2.imwrite(os.path.join(directory, 'G', f"{count['g']}.png"), frame)
    if interrupt & 0xFF == ord('h'):
        cv2.imwrite(os.path.join(directory, 'H', f"{count['h']}.png"), frame)
    if interrupt & 0xFF == ord('i'):
        cv2.imwrite(os.path.join(directory, 'I', f"{count['i']}.png"), frame)
    if interrupt & 0xFF == ord('j'):
        cv2.imwrite(os.path.join(directory, 'J', f"{count['j']}.png"), frame)
    if interrupt & 0xFF == ord('k'):
        cv2.imwrite(os.path.join(directory, 'K', f"{count['k']}.png"), frame)
    if interrupt & 0xFF == ord('l'):
        cv2.imwrite(os.path.join(directory, 'L', f"{count['l']}.png"), frame)
    if interrupt & 0xFF == ord('m'):
        cv2.imwrite(os.path.join(directory, 'M', f"{count['m']}.png"), frame)
    if interrupt & 0xFF == ord('n'):
        cv2.imwrite(os.path.join(directory, 'N', f"{count['n']}.png"), frame)
    if interrupt & 0xFF == ord('o'):
        cv2.imwrite(os.path.join(directory, 'O', f"{count['o']}.png"), frame)
    if interrupt & 0xFF == ord('p'):
        cv2.imwrite(os.path.join(directory, 'P', f"{count['p']}.png"), frame)
    if interrupt & 0xFF == ord('q'):
        cv2.imwrite(os.path.join(directory, 'Q', f"{count['q']}.png"), frame)
    if interrupt & 0xFF == ord('r'):
        cv2.imwrite(os.path.join(directory, 'R', f"{count['r']}.png"), frame)
    if interrupt & 0xFF == ord('s'):
        cv2.imwrite(os.path.join(directory, 'S', f"{count['s']}.png"), frame)
    if interrupt & 0xFF == ord('t'):
        cv2.imwrite(os.path.join(directory, 'T', f"{count['t']}.png"), frame)
    if interrupt & 0xFF == ord('u'):
        cv2.imwrite(os.path.join(directory, 'U', f"{count['u']}.png"), frame)
    if interrupt & 0xFF == ord('v'):
        cv2.imwrite(os.path.join(directory, 'V', f"{count['v']}.png"), frame)
    if interrupt & 0xFF == ord('w'):
        cv2.imwrite(os.path.join(directory, 'W', f"{count['w']}.png"), frame)
    if interrupt & 0xFF == ord('x'):
        cv2.imwrite(os.path.join(directory, 'X', f"{count['x']}.png"), frame)
    if interrupt & 0xFF == ord('y'):
        cv2.imwrite(os.path.join(directory, 'Y', f"{count['y']}.png"), frame)
    if interrupt & 0xFF == ord('z'):
        cv2.imwrite(os.path.join(directory, 'Z', f"{count['z']}.png"), frame)

cap.release()
cv2.destroyAllWindows()