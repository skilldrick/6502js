/*
*  6502 assembler and emulator in Javascript
*  (C)2006-2010 Stian Soreng - www.6502asm.com
*
*  Released under the GNU General Public License
*  see http://gnu.org/licenses/gpl.html
*
*/

var MAX_MEM = ((32*32)-1);
var codeCompiledOK = false;
var regA = 0;
var regX = 0;
var regY = 0;
var regP = 0;
var regPC = 0x600;
var regSP = 0x100;
var memory = new Array(0x600);
var runForever = false;
var labelIndex = [];
var labelPtr = 0;
var codeRunning = false;
var xmlhttp;
var myInterval;
var display = new Array(0x400);
var defaultCodePC = 0x600;
var debug = false;
var palette = [
  "#000000", "#ffffff", "#880000", "#aaffee",
  "#cc44cc", "#00cc55", "#0000aa", "#eeee77",
  "#dd8855", "#664400", "#ff7777", "#333333",
  "#777777", "#aaff66", "#0088ff", "#bbbbbb"
];


var instructions = {

  i00: function () {
    codeRunning = false;
  },

  i01: function () {
    addr = popByte() + regX;
    value = memory[addr] + (memory[addr+1] << 8);
    regA |= value;
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i05: function () {
    zp = popByte();
    regA |= memory[zp];
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i06: function () {
    zp = popByte();
    value = memory[zp];
    regP = (regP & 0xfe) | ((value>>7)&1);
    value = value << 1;
    memStoreByte(zp, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i08: function () {
    stackPush(regP);
  },

  i09: function () {
    regA |= popByte();
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i0a: function () {
    regP = (regP & 0xfe) | ((regA>>7)&1);
    regA = regA<<1;
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i0d: function () {
    regA |= memory[popWord()];
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i0e: function () {
    addr = popWord();
    value = memory[addr];
    regP = (regP & 0xfe) | ((value>>7)&1);
    value = value << 1;
    memStoreByte(addr, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 2;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i10: function () {
    offset = popByte();
    if ((regP & 0x80) == 0) { jumpBranch(offset); }
  },

  i11: function () {
    zp = popByte();
    value = memory[zp] + (memory[zp+1]<<8) + regY;
    regA |= memory[value];
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i15: function () {
    addr = (popByte() + regX) & 0xff;
    regA |= memory[addr];
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i16: function () {
    addr = (popByte() + regX) & 0xff;
    value = memory[addr];
    regP = (regP & 0xfe) | ((value>>7)&1);
    value = value << 1;
    memStoreByte(addr, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i18: function () {
    regP &= 0xfe;
  },

  i19: function () {
    addr = popWord() + regY;
    regA |= memory[addr];
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i1d: function () {
    addr = popWord() + regX;
    regA |= memory[addr];
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i1e: function () {
    addr = popWord() + regX;
    value = memory[addr];
    regP = (regP & 0xfe) | ((value>>7)&1);
    value = value << 1;
    memStoreByte(addr, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i20: function () {
    addr = popWord();
    currAddr = regPC-1;
    stackPush(((currAddr >> 8) & 0xff));
    stackPush((currAddr & 0xff));
    regPC = addr;
  },

  i21: function () {
    addr = (popByte() + regX)&0xff;
    value = memory[addr]+(memory[addr+1] << 8);
    regA &= value;
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i24: function () {
    zp = popByte();
    value = memory[zp];
    if (value & regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    regP = (regP & 0x3f) | (value & 0xc0);
  },

  i25: function () {
    zp = popByte();
    regA &= memory[zp];
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 2;
    }
    if (regA & 0x80) {
      regP &= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i26: function () {
    sf = (regP & 1);
    addr = popByte();
    value = memory[addr]; //  & regA;  -- Thanks DMSC ;)
    regP = (regP & 0xfe) | ((value>>7)&1);
  value = value << 1;
  value |= sf;
  memStoreByte(addr, value);
  if (value) {
    regP &= 0xfd;
  } else {
    regP |= 0x02;
  }
  if (value & 0x80) {
    regP |= 0x80;
  } else {
    regP &= 0x7f;
  }
  },

  i28: function () {
    regP = stackPop() | 0x20;
  },

  i29: function () {
    regA &= popByte();
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i2a: function () {
    sf = (regP&1);
    regP = (regP&0xfe) | ((regA>>7)&1);
    regA = regA << 1;
    regA |= sf;
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i2c: function () {
    value = memory[popWord()];
    if (value & regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    regP = (regP & 0x3f) | (value & 0xc0);
  },

  i2d: function () {
    value = memory[popWord()];
    regA &= value;
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i2e: function () {
    sf = regP & 1;
    addr = popWord();
    value = memory[addr];
    regP = (regP & 0xfe) | ((value>>7)&1);
    value = value << 1;
    value |= sf;
    memStoreByte(addr, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i30: function () {
    offset = popByte();
    if (regP & 0x80) { jumpBranch(offset); }
  },

  i31: function () {
    zp = popByte();
    value = memory[zp]+(memory[zp+1]<<8) + regY;
    regA &= memory[value];
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i35: function () {
    zp = popByte();
    value = memory[zp]+(memory[zp+1]<<8) + regX;
    regA &= memory[value];
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i36: function () {
    sf = regP & 1;
    addr = (popByte() + regX) & 0xff;
    value = memory[addr];
    regP = (regP & 0xfe) | ((value>>7)&1);
    value = value << 1;
    value |= sf;
    memStoreByte(addr, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i38: function () {
    regP |= 1;
  },

  i39: function () {
    addr = popWord() + regY;
    value = memory[addr];
    regA &= value;
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i3d: function () {
    addr = popWord() + regX;
    value = memory[addr];
    regA &= value;
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i3e: function () {
    sf = regP&1;
    addr = popWord() + regX;
    value = memory[addr];
    regP = (regP & 0xfe) | ((value>>7)&1);
    value = value << 1;
    value |= sf;
    memStoreByte(addr, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i40: function () {
  },

  i41: function () {
    zp = (popByte() + regX)&0xff;
    value = memory[zp]+ (memory[zp+1]<<8);
    regA ^= memory[value];
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i45: function () {
    addr = (popByte() + regX) & 0xff;
    value = memory[addr];
    regA ^= value;
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i46: function () {
    addr = popByte() & 0xff;
    value = memory[addr];
    regP = (regP & 0xfe) | (value&1);
    value = value >> 1;
    memStoreByte(addr, value);
    if (value != 0) {
      regP &= 0xfd;
    } else {
      regP |= 2;
    }
    if ((value&0x80) == 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i48: function () {
    stackPush(regA);
  },

  i49: function () {
    regA ^= popByte();
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i4a: function () {
    regP = (regP&0xfe) | (regA&1);
    regA = regA >> 1;
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i4c: function () {
    regPC = popWord();
  },

  i4d: function () {
    addr = popWord();
    value = memory[addr];
    regA ^= value;
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i4e: function () {
    addr = popWord();
    value = memory[addr];
    regP = (regP&0xfe)|(value&1);
    value = value >> 1;
    memStoreByte(addr, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i50: function () {
    offset = popByte();
    if ((regP & 0x40) == 0) { jumpBranch(offset); }
  },

  i51: function () {
    zp = popByte();
    value = memory[zp] + (memory[zp+1]<<8) + regY;
    regA ^= memory[value];
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i55: function () {
    addr = (popByte() + regX) & 0xff;
    regA ^= memory[ addr ];
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i56: function () {
    addr = (popByte() + regX) & 0xff;
    value = memory[ addr ];
    regP = (regP&0xfe) | (value&1);
    value = value >> 1;
    memStoreByte(addr, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i58: function () {
  },

  i59: function () {
    addr = popWord() + regY;
    value = memory[ addr ];
    regA ^= value;
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i5d: function () {
    addr = popWord() + regX;
    value = memory[ addr ];
    regA ^= value;
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i5e: function () {
    addr = popWord() + regX;
    value = memory[ addr ];
    regP = (regP&0xfe) | (value&1);
    value = value >> 1;
    memStoreByte(addr, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i60: function () {
    regPC = (stackPop()+1) | (stackPop()<<8);
  },

  i61: function () {
    zp = (popByte() + regX)&0xff;
    addr = memory[zp] + (memory[zp+1]<<8);
    value = memory[ addr ];
    testADC(value);
  },

  i65: function () {
    addr = popByte();
    value = memory[ addr ];
    testADC(value);
  },

  i66: function () {
    sf = regP&1;
    addr = popByte();
    value = memory[ addr ];
    regP = (regP&0xfe)|(value&1);
    value = value >> 1;
    if (sf) { value |= 0x80; }
    memStoreByte(addr, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i68: function () {
    regA = stackPop();
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i69: function () {
    value = popByte();
    testADC(value);
  },

  i6a: function () {
    sf = regP&1;
    regP = (regP&0xfe) | (regA&1);
    regA = regA >> 1;
    if (sf) { regA |= 0x80; }
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i6c: function () {
  },

  i6d: function () {
    addr = popWord();
    value = memory[ addr ];
    testADC(value);
  },

  i6e: function () {
    sf = regP&1;
    addr = popWord();
    value = memory[ addr ];
    regP = (regP&0xfe)|(value&1);
    value = value >> 1;
    if (sf) { value |= 0x80; }
    memStoreByte(addr, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i70: function () {
    offset = popByte();
    if (regP & 0x40) { jumpBranch(offset); }
  },

  i71: function () {
    zp = popByte();
    addr = memory[zp] + (memory[zp+1]<<8);
    value = memory[ addr + regY ];
    testADC(value);
  },

  i75: function () {
    addr = (popByte() + regX) & 0xff;
    value = memory[ addr ];
    regP = (regP&0xfe) | (value&1);
    testADC(value);
  },

  i76: function () {
    sf = (regP&1);
    addr = (popByte() + regX) & 0xff;
    value = memory[ addr ];
    regP = (regP&0xfe) | (value&1);
    value = value >> 1;
    if (sf) { value |= 0x80; }
    memStoreByte(addr, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i78: function () {
  },

  i79: function () {
    addr = popWord();
    value = memory[ addr + regY ];
    testADC(value);
  },

  i7d: function () {
    addr = popWord();
    value = memory[ addr + regX ];
    testADC(value);
  },

  i7e: function () {
    sf = regP&1;
    addr = popWord() + regX;
    value = memory[ addr ];
    regP = (regP&0xfe) | (value&1);
    value = value >> 1;
    if (value) { value |= 0x80; }
    memStoreByte(addr, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i81: function () {
    zp = (popByte()+regX)&0xff;
    addr = memory[zp] + (memory[zp+1]<<8);
    memStoreByte(addr, regA);
  },

  i84: function () {
    memStoreByte(popByte(), regY);
  },

  i85: function () {
    memStoreByte(popByte(), regA);
  },

  i86: function () {
    memStoreByte(popByte(), regX);
  },

  i88: function () {
    regY = (regY-1) & 0xff;
    if (regY) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regY & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i8a: function () {
    regA = regX & 0xff;
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i8c: function () {
    memStoreByte(popWord(), regY);
  },

  i8d: function () {
    memStoreByte(popWord(), regA);
  },

  i8e: function () {
    memStoreByte(popWord(), regX);
  },

  i90: function () {
    offset = popByte();
    if ((regP & 1) == 0) { jumpBranch(offset); }
  },

  i91: function () {
    zp = popByte();
    addr = memory[zp] + (memory[zp+1]<<8) + regY;
    memStoreByte(addr, regA);
  },

  i94: function () {
    memStoreByte(popByte() + regX, regY);
  },

  i95: function () {
    memStoreByte(popByte() + regX, regA);
  },

  i96: function () {
    memStoreByte(popByte() + regY, regX);
  },

  i98: function () {
    regA = regY & 0xff;
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  i99: function () {
    memStoreByte(popWord() + regY, regA);
  },

  i9a: function () {
    regSP = regX & 0xff;
  },

  i9d: function () {
    addr = popWord();
    memStoreByte(addr + regX, regA);
  },

  ia0: function () {
    regY = popByte();
    if (regY) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regY & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ia1: function () {
    zp = (popByte()+regX)&0xff;
    addr = memory[zp] + (memory[zp+1]<<8);
    regA = memory[ addr ];
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ia2: function () {
    regX = popByte();
    if (regX) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regX & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ia4: function () {
    regY = memory[ popByte() ];
    if (regY) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regY & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ia5: function () {
    regA = memory[ popByte() ];
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ia6: function () {
    regX = memory[ popByte() ];
    if (regX) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regX & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ia8: function () {
    regY = regA & 0xff;
    if (regY) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regY & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ia9: function () {
    regA = popByte();
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  iaa: function () {
    regX = regA & 0xff;
    if (regX) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regX & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  iac: function () {
    regY = memory[ popWord() ];
    if (regY) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regY & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  iad: function () {
    regA = memory[ popWord() ];
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  iae: function () {
    regX = memory[ popWord() ];
    if (regX) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regX & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ib0: function () {
    offset = popByte();
    if (regP & 1) { jumpBranch(offset); }
  },

  ib1: function () {
    zp = popByte();
    addr = memory[zp] + (memory[zp+1]<<8) + regY;
    regA = memory[ addr ];
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ib4: function () {
    regY = memory[ popByte() + regX ];
    if (regY) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regY & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ib5: function () {
    regA = memory[ (popByte() + regX) & 0xff ];
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ib6: function () {
    regX = memory[ popByte() + regY ];
    if (regX) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regX & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ib8: function () {
    regP &= 0xbf;
  },

  ib9: function () {
    addr = popWord() + regY;
    regA = memory[ addr ];
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  iba: function () {
    regX = regSP & 0xff;
  },

  ibc: function () {
    addr = popWord() + regX;
    regY = memory[ addr ];
    if (regY) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regY & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ibd: function () {
    addr = popWord() + regX;
    regA = memory[ addr ];
    if (regA) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regA & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ibe: function () {
    addr = popWord() + regY;
    regX = memory[ addr ];
    if (regX) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regX & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ic0: function () {
    value = popByte();
    if ((regY+value) > 0xff) {
      regP |= 1;
    } else {
      regP &= 0xfe;
    }
    ov = value;
    value = (regY-value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ic1: function () {
    zp = popByte();
    addr = memory[zp] + (memory[zp+1]<<8) + regY;
    value = memory[ addr ];
    doCompare(regA, value);
  },

  ic4: function () {
    value = memory[ popByte() ];
    doCompare(regY, value);
  },

  ic5: function () {
    value = memory[ popByte() ];
    doCompare(regA, value);
  },

  ic6: function () {
    zp = popByte();
    value = memory[ zp ];
    --value;
    memStoreByte(zp, value&0xff);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ic8: function () {
    regY = (regY + 1) & 0xff;
    if (regY) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regY & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ic9: function () {
    value = popByte();
    doCompare(regA, value);
  },

  ica: function () {
    regX = (regX-1) & 0xff;
    if (regX) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regX & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  icc: function () {
    value = memory[ popWord() ];
    doCompare(regY, value);
  },

  icd: function () {
    value = memory[ popWord() ];
    doCompare(regA, value);
  },

  ice: function () {
    addr = popWord();
    value = memory[ addr ];
    --value;
    value = value&0xff;
    memStoreByte(addr, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  id0: function () {
    offset = popByte();
    if ((regP&2)==0) { jumpBranch(offset); }
  },

  id1: function () {
    zp = popByte();
    addr = memory[zp] + (memory[zp+1]<<8) + regY;
    value = memory[ addr ];
    doCompare(regA, value);
  },

  id5: function () {
    value = memory[ popByte() + regX ];
    doCompare(regA, value);
  },

  id6: function () {
    addr = popByte() + regX;
    value = memory[ addr ];
    --value;
    value = value&0xff;
    memStoreByte(addr, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  id8: function () {
    regP &= 0xf7;
  },

  id9: function () {
    addr = popWord() + regY;
    value = memory[ addr ];
    doCompare(regA, value);
  },

  idd: function () {
    addr = popWord() + regX;
    value = memory[ addr ];
    doCompare(regA, value);
  },

  ide: function () {
    addr = popWord() + regX;
    value = memory[ addr ];
    --value;
    value = value&0xff;
    memStoreByte(addr, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ie0: function () {
    value = popByte();
    doCompare(regX, value);
  },

  ie1: function () {
    zp = (popByte()+regX)&0xff;
    addr = memory[zp] + (memory[zp+1]<<8);
    value = memory[ addr ];
    testSBC(value);
  },

  ie4: function () {
    value = memory[ popByte() ];
    doCompare(regX, value);
  },

  ie5: function () {
    addr = popByte();
    value = memory[ addr ];
    testSBC(value);
  },

  ie6: function () {
    zp = popByte();
    value = memory[ zp ];
    ++value;
    value = (value)&0xff;
    memStoreByte(zp, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ie8: function () {
    regX = (regX + 1) & 0xff;
    if (regX) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (regX & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ie9: function () {
    value = popByte();
    testSBC(value);
  },

  iea: function () {
  },

  iec: function () {
    value = memory[ popWord() ];
    doCompare(regX, value);
  },

  ied: function () {
    addr = popWord();
    value = memory[ addr ];
    testSBC(value);
  },

  iee: function () {
    addr = popWord();
    value = memory[ addr ];
    ++value;
    value = (value)&0xff;
    memStoreByte(addr, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  if0: function () {
    offset = popByte();
    if (regP&2) { jumpBranch(offset); }
  },

  if1: function () {
    zp = popByte();
    addr = memory[zp] + (memory[zp+1]<<8);
    value = memory[ addr + regY ];
    testSBC(value);
  },

  if5: function () {
    addr = (popByte() + regX)&0xff;
    value = memory[ addr ];
    regP = (regP&0xfe)|(value&1);
    testSBC(value);
  },

  if6: function () {
    addr = popByte() + regX;
    value = memory[ addr ];
    ++value;
    value=value&0xff;
    memStoreByte(addr, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  if8: function () {
    regP |= 8;
  },

  if9: function () {
    addr = popWord();
    value = memory[ addr + regY ];
    testSBC(value);
  },

  ifd: function () {
    addr = popWord();
    value = memory[ addr + regX ];
    testSBC(value);
  },

  ife: function () {
    addr = popWord() + regX;
    value = memory[ addr ];
    ++value;
    value=value&0xff;
    memStoreByte(addr, value);
    if (value) {
      regP &= 0xfd;
    } else {
      regP |= 0x02;
    }
    if (value & 0x80) {
      regP |= 0x80;
    } else {
      regP &= 0x7f;
    }
  },

  ierr: function () {
    message("Address $" + addr2hex(regPC) + " - unknown opcode " + opcode);
    codeRunning = false;
  }
}

var inst = [
  instructions.i00,  //00
  instructions.i01,  //01
  instructions.ierr, //02
  instructions.ierr, //03
  instructions.ierr, //04
  instructions.i05,  //05
  instructions.i06,  //06
  instructions.ierr, //07
  instructions.i08,  //08
  instructions.i09,  //09
  instructions.i0a,  //0a
  instructions.ierr, //0b
  instructions.ierr, //0c
  instructions.i0d,  //0d
  instructions.i0e,  //0e
  instructions.ierr, //0f
  instructions.i10,  //10
  instructions.i11,  //11
  instructions.ierr, //12
  instructions.ierr, //13
  instructions.ierr, //14
  instructions.i15,  //15
  instructions.i16,  //16
  instructions.ierr, //17
  instructions.i18,  //18
  instructions.i19,  //19
  instructions.ierr, //1a
  instructions.ierr, //1b
  instructions.ierr, //1c
  instructions.i1d,  //1d
  instructions.i1e,  //1e
  instructions.ierr, //1f
  instructions.i20,  //20
  instructions.i21,  //21
  instructions.ierr, //22
  instructions.ierr, //23
  instructions.i24,  //24
  instructions.i25,  //25
  instructions.i26,  //26
  instructions.ierr, //27
  instructions.i28,  //28
  instructions.i29,  //29
  instructions.i2a,  //2a
  instructions.ierr, //2b
  instructions.i2c,  //2c
  instructions.i2d,  //2d
  instructions.i2e,  //2e
  instructions.ierr, //2f
  instructions.i30,  //30
  instructions.i31,  //31
  instructions.ierr, //32
  instructions.ierr, //33
  instructions.ierr, //34
  instructions.i35,  //35
  instructions.i36,  //36
  instructions.ierr, //37
  instructions.i38,  //38
  instructions.i39,  //39
  instructions.ierr, //3a
  instructions.ierr, //3b
  instructions.ierr, //3c
  instructions.i3d,  //3d
  instructions.i3e,  //3e
  instructions.ierr, //3f
  instructions.i40,  //40
  instructions.i41,  //41
  instructions.ierr, //42
  instructions.ierr, //43
  instructions.ierr, //44
  instructions.i45,  //45
  instructions.i46,  //46
  instructions.ierr, //47
  instructions.i48,  //48
  instructions.i49,  //49
  instructions.i4a,  //4a
  instructions.ierr, //4b
  instructions.i4c,  //4c
  instructions.i4d,  //4d
  instructions.i4e,  //4e
  instructions.ierr, //4f
  instructions.i50,  //50
  instructions.i51,  //51
  instructions.ierr, //52
  instructions.ierr, //53
  instructions.ierr, //54
  instructions.i55,  //55
  instructions.i56,  //56
  instructions.ierr, //57
  instructions.i58,  //58
  instructions.i59,  //59
  instructions.ierr, //5a
  instructions.ierr, //5b
  instructions.ierr, //5c
  instructions.i5d,  //5d
  instructions.i5e,  //5e
  instructions.ierr, //5f
  instructions.i60,  //60
  instructions.i61,  //61
  instructions.ierr, //62
  instructions.ierr, //63
  instructions.ierr, //64
  instructions.i65,  //65
  instructions.i66,  //66
  instructions.ierr, //67
  instructions.i68,  //68
  instructions.i69,  //69
  instructions.i6a,  //6a
  instructions.ierr, //6b
  instructions.i6c,  //6c
  instructions.i6d,  //6d
  instructions.i6e,  //6e
  instructions.ierr, //6f
  instructions.i70,  //70
  instructions.i71,  //71
  instructions.ierr, //72
  instructions.ierr, //73
  instructions.ierr, //74
  instructions.i75,  //75
  instructions.i76,  //76
  instructions.ierr, //77
  instructions.i78,  //78
  instructions.i79,  //79
  instructions.ierr, //7a
  instructions.ierr, //7b
  instructions.ierr, //7c
  instructions.i7d,  //7d
  instructions.i7e,  //7e
  instructions.ierr, //7f
  instructions.ierr, //80
  instructions.i81,  //81
  instructions.ierr, //82
  instructions.ierr, //83
  instructions.i84,  //84
  instructions.i85,  //85
  instructions.i86,  //86
  instructions.ierr, //87
  instructions.i88,  //88
  instructions.ierr, //89
  instructions.i8a,  //8a
  instructions.ierr, //8b
  instructions.i8c,  //8c
  instructions.i8d,  //8d
  instructions.i8e,  //8e
  instructions.ierr, //8f
  instructions.i90,  //90
  instructions.i91,  //91
  instructions.ierr, //92
  instructions.ierr, //93
  instructions.i94,  //94
  instructions.i95,  //95
  instructions.i96,  //96
  instructions.ierr, //97
  instructions.i98,  //98
  instructions.i99,  //99
  instructions.i9a,  //9a
  instructions.ierr, //9b
  instructions.ierr, //9c
  instructions.i9d,  //9d
  instructions.ierr, //9e
  instructions.ierr, //9f
  instructions.ia0,  //a0
  instructions.ia1,  //a1
  instructions.ia2,  //a2
  instructions.ierr, //a3
  instructions.ia4,  //a4
  instructions.ia5,  //a5
  instructions.ia6,  //a6
  instructions.ierr, //a7
  instructions.ia8,  //a8
  instructions.ia9,  //a9
  instructions.iaa,  //aa
  instructions.ierr, //ab
  instructions.iac,  //ac
  instructions.iad,  //ad
  instructions.iae,  //ae
  instructions.ierr, //af
  instructions.ib0,  //b0
  instructions.ib1,  //b1
  instructions.ierr, //b2
  instructions.ierr, //b3
  instructions.ib4,  //b4
  instructions.ib5,  //b5
  instructions.ib6,  //b6
  instructions.ierr, //b7
  instructions.ib8,  //b8
  instructions.ib9,  //b9
  instructions.iba,  //ba
  instructions.ierr, //bb
  instructions.ibc,  //bc
  instructions.ibd,  //bd
  instructions.ibe,  //be
  instructions.ierr, //bf
  instructions.ic0,  //c0
  instructions.ic1,  //c1
  instructions.ierr, //c2
  instructions.ierr, //c3
  instructions.ic4,  //c4
  instructions.ic5,  //c5
  instructions.ic6,  //c6
  instructions.ierr, //c7
  instructions.ic8,  //c8
  instructions.ic9,  //c9
  instructions.ica,  //ca
  instructions.ierr, //cb
  instructions.icc,  //cc
  instructions.icd,  //cd
  instructions.ierr, //ce
  instructions.ierr, //cf
  instructions.id0,  //d0
  instructions.id1,  //d1
  instructions.ierr, //d2
  instructions.ierr, //d3
  instructions.ierr, //d4
  instructions.id5,  //d5
  instructions.id6,  //d6
  instructions.ierr, //d7
  instructions.id8,  //d8
  instructions.id9,  //d9
  instructions.ierr, //da
  instructions.ierr, //db
  instructions.ierr, //dc
  instructions.idd,  //dd
  instructions.ide,  //de
  instructions.ierr, //df
  instructions.ie0,  //e0
  instructions.ie1,  //e1
  instructions.ierr, //e2
  instructions.ierr, //e3
  instructions.ie4,  //e4
  instructions.ie5,  //e5
  instructions.ie6,  //e6
  instructions.ierr, //e7
  instructions.ie8,  //e8
  instructions.ie9,  //e9
  instructions.iea,  //ea
  instructions.ierr, //eb
  instructions.iec,  //ec
  instructions.ied,  //ed
  instructions.iee,  //ee
  instructions.ierr, //ef
  instructions.if0,  //f0
  instructions.if1,  //f1
  instructions.ierr, //f2
  instructions.ierr, //f3
  instructions.ierr, //f4
  instructions.if5,  //f5
  instructions.if6,  //f6
  instructions.ierr, //f7
  instructions.if8,  //f8
  instructions.if9,  //f9
  instructions.ierr, //fa
  instructions.ierr, //fb
  instructions.ierr, //fc
  instructions.ifd,  //fd
  instructions.ife,  //fe
  instructions.ierr  //ff
];

var Opcodes = [
  /* Name, Imm,  ZP,   ZPX,  ZPY,  ABS,  ABSX, ABSY, INDX, INDY, SNGL, BRA */
  ["ADC", 0x69, 0x65, 0x75, null, 0x6d, 0x7d, 0x79, 0x61, 0x71, null, null],
  ["AND", 0x29, 0x25, 0x35, null, 0x2d, 0x3d, 0x39, 0x21, 0x31, null, null],
  ["ASL", null, 0x06, 0x16, null, 0x0e, 0x1e, null, null, null, 0x0a, null],
  ["BIT", null, 0x24, null, null, 0x2c, null, null, null, null, null, null],
  ["BPL", null, null, null, null, null, null, null, null, null, null, 0x10],
  ["BMI", null, null, null, null, null, null, null, null, null, null, 0x30],
  ["BVC", null, null, null, null, null, null, null, null, null, null, 0x50],
  ["BVS", null, null, null, null, null, null, null, null, null, null, 0x70],
  ["BCC", null, null, null, null, null, null, null, null, null, null, 0x90],
  ["BCS", null, null, null, null, null, null, null, null, null, null, 0xb0],
  ["BNE", null, null, null, null, null, null, null, null, null, null, 0xd0],
  ["BEQ", null, null, null, null, null, null, null, null, null, null, 0xf0],
  ["BRK", null, null, null, null, null, null, null, null, null, 0x00, null],
  ["CMP", 0xc9, 0xc5, 0xd5, null, 0xcd, 0xdd, 0xd9, 0xc1, 0xd1, null, null],
  ["CPX", 0xe0, 0xe4, null, null, 0xec, null, null, null, null, null, null],
  ["CPY", 0xc0, 0xc4, null, null, 0xcc, null, null, null, null, null, null],
  ["DEC", null, 0xc6, 0xd6, null, 0xce, 0xde, null, null, null, null, null],
  ["EOR", 0x49, 0x45, 0x55, null, 0x4d, 0x5d, 0x59, 0x41, 0x51, null, null],
  ["CLC", null, null, null, null, null, null, null, null, null, 0x18, null],
  ["SEC", null, null, null, null, null, null, null, null, null, 0x38, null],
  ["CLI", null, null, null, null, null, null, null, null, null, 0x58, null],
  ["SEI", null, null, null, null, null, null, null, null, null, 0x78, null],
  ["CLV", null, null, null, null, null, null, null, null, null, 0xb8, null],
  ["CLD", null, null, null, null, null, null, null, null, null, 0xd8, null],
  ["SED", null, null, null, null, null, null, null, null, null, 0xf8, null],
  ["INC", null, 0xe6, 0xf6, null, 0xee, 0xfe, null, null, null, null, null],
  ["JMP", null, null, null, null, 0x4c, null, null, null, null, null, null],
  ["JSR", null, null, null, null, 0x20, null, null, null, null, null, null],
  ["LDA", 0xa9, 0xa5, 0xb5, null, 0xad, 0xbd, 0xb9, 0xa1, 0xb1, null, null],
  ["LDX", 0xa2, 0xa6, null, 0xb6, 0xae, null, 0xbe, null, null, null, null],
  ["LDY", 0xa0, 0xa4, 0xb4, null, 0xac, 0xbc, null, null, null, null, null],
  ["LSR", null, 0x46, 0x56, null, 0x4e, 0x5e, null, null, null, 0x4a, null],
  ["NOP", null, null, null, null, null, null, null, null, null, 0xea, null],
  ["ORA", 0x09, 0x05, 0x15, null, 0x0d, 0x1d, 0x19, 0x01, 0x11, null, null],
  ["TAX", null, null, null, null, null, null, null, null, null, 0xaa, null],
  ["TXA", null, null, null, null, null, null, null, null, null, 0x8a, null],
  ["DEX", null, null, null, null, null, null, null, null, null, 0xca, null],
  ["INX", null, null, null, null, null, null, null, null, null, 0xe8, null],
  ["TAY", null, null, null, null, null, null, null, null, null, 0xa8, null],
  ["TYA", null, null, null, null, null, null, null, null, null, 0x98, null],
  ["DEY", null, null, null, null, null, null, null, null, null, 0x88, null],
  ["INY", null, null, null, null, null, null, null, null, null, 0xc8, null],
  ["ROR", null, 0x66, 0x76, null, 0x6e, 0x7e, null, null, null, 0x6a, null],
  ["ROL", null, 0x26, 0x36, null, 0x2e, 0x3e, null, null, null, 0x2a, null],
  ["RTI", null, null, null, null, null, null, null, null, null, 0x40, null],
  ["RTS", null, null, null, null, null, null, null, null, null, 0x60, null],
  ["SBC", 0xe9, 0xe5, 0xf5, null, 0xed, 0xfd, 0xf9, 0xe1, 0xf1, null, null],
  ["STA", null, 0x85, 0x95, null, 0x8d, 0x9d, 0x99, 0x81, 0x91, null, null],
  ["TXS", null, null, null, null, null, null, null, null, null, 0x9a, null],
  ["TSX", null, null, null, null, null, null, null, null, null, 0xba, null],
  ["PHA", null, null, null, null, null, null, null, null, null, 0x48, null],
  ["PLA", null, null, null, null, null, null, null, null, null, 0x68, null],
  ["PHP", null, null, null, null, null, null, null, null, null, 0x08, null],
  ["PLP", null, null, null, null, null, null, null, null, null, 0x28, null],
  ["STX", null, 0x86, null, 0x96, 0x8e, null, null, null, null, null, null],
  ["STY", null, 0x84, 0x94, null, 0x8c, null, null, null, null, null, null],
  ["---", null, null, null, null, null, null, null, null, null, null, null]
];

// Initialize everything.

document.getElementById("compileButton").disabled = false;
document.getElementById("runButton").disabled = true;
document.getElementById("hexdumpButton").disabled = true;
document.getElementById("fileSelect").disabled = false;
document.getElementById("submitCode").disabled = true;
//document.getElementById("watch").disabled = true;
document.getElementById("watch").checked = false;
document.getElementById("stepButton").disabled = true;
document.getElementById("gotoButton").disabled = true;
document.addEventListener("keypress", keyPress, true);

// Paint the "display"

html = '<table class="screen">';
for (y=0; y<32; y++) {
  html += "<tr>";
  for (x=0; x<32; x++) {
    html += '<td class="screen" id="x' + x + 'y' + y + '"></td>';
  }
  html += "</tr>";
}
html += "</table>";
document.getElementById("screen").innerHTML = html;

// Reset everything

reset();

/*
*  keyPress() - Store keycode in ZP $ff
*
*/

function keyPress(e) {
  if (typeof window.event != "undefined") {
    e = window.event;
  }
  if (e.type == "keypress") {
    value = e.which;
    memStoreByte(0xff, value);
  }
}

/*
*  debugExec() - Execute one instruction and print values
*/

function debugExec() {
  if (codeRunning) {
    execute();
  }
  updateDebugInfo();
}

function updateDebugInfo() {
  var html = "<br />";
  html += "A=$" + num2hex(regA)+" X=$" + num2hex(regX)+" Y=$" + num2hex(regY)+"<br />";
  html += "P=$" + num2hex(regP)+" SP=$"+addr2hex(regSP)+" PC=$" + addr2hex(regPC);
  document.getElementById("md").innerHTML = html;
}

/*
*  gotoAddr() - Set PC to address (or address of label)
*
*/

function gotoAddr() {
  var inp = prompt("Enter address or label", "");
  var addr = 0;
  if (findLabel(inp)) {
    addr = getLabelPC(inp);
  } else {
    if (inp.match(new RegExp(/^0x[0-9a-f]{1,4}$/i))) {
      inp = inp.replace(/^0x/, "");
      addr = parseInt(inp, 16);
    } else if (inp.match(new RegExp(/^\$[0-9a-f]{1,4}$/i))) {
      inp = inp.replace(/^\$/, "");
      addr = parseInt(inp, 16);
    }
  }
  if (addr == 0) {
    alert("Unable to find/parse given address/label");
  } else {
    regPC = addr;
  }
  updateDebugInfo();
}


/*
*  stopDebugger() - stops debugger
*
*/

function stopDebugger() {
  debug = false;
  if (codeRunning) {
    document.getElementById("stepButton").disabled = true;
    document.getElementById("gotoButton").disabled = true;
  }
}

function enableDebugger() {
  debug = true;
  if (codeRunning) {
    updateDebugInfo();
    document.getElementById("stepButton").disabled = false;
    document.getElementById("gotoButton").disabled = false;
  }
}
/*
*  toggleDebug() - Toggles debugging on/off
*
*/

function toggleDebug() {
  // alert("debug="+debug+" og codeRunning="+codeRunning);
  debug = !debug;
  if (debug) {
    enableDebugger();
  } else {
    stopDebugger();
  }
}


/*
*  disableButtons() - Disables the Run and Debug buttons when text is
*                     altered in the code editor
*
*/

function disableButtons() {
  document.getElementById("runButton").disabled = true;
  document.getElementById("hexdumpButton").disabled = true;
  document.getElementById("fileSelect").disabled = false;
  document.getElementById("compileButton").disabled = false;
  document.getElementById("runButton").value = "Run";
  document.getElementById("submitCode").disabled = true;
  codeCompiledOK = false;
  codeRunning = false;
  document.getElementById("code").focus();
  document.getElementById("stepButton").disabled = true;
  document.getElementById("gotoButton").disabled = true;
  clearInterval(myInterval);
}

/*
*  Load() - Loads a file from server
*
*/

function Load(file) {
  reset();
  disableButtons();
  document.getElementById("code").value = "Loading, please wait..";
  document.getElementById("compileButton").disabled = true;
  xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = FileLoaded;
  xmlhttp.open("GET", "/examples/" + file);
  xmlhttp.send(null);
  stopDebugger();
}

function FileLoaded() {
  if (xmlhttp.readyState == 4) {
    if (xmlhttp.status == 200) {
      document.getElementById("code").value = xmlhttp.responseText;
      document.getElementById("compileButton").disabled = false;
    }
  }
}

/*
*  reset() - Reset CPU and memory.
*
*/

function reset() {
  for (y=0; y<32; y++) {
    for (x=0; x<32; x++) {
      display[y*32+x] = document.getElementById("x"+x+"y"+y).style;
      display[y*32+x].background = "#000000";
    }
  }
  for (x=0; x<0x600; x++) { // clear ZP, stack and screen
    memory[x] = 0x00;
  }
  regA = regX = regY = 0;
  defaultCodePC = regPC = 0x600;
  regSP = 0x100;
  regP = 0x20;
  runForever = false;
}


/*
*  message() - Prints text in the message window
*
*/

function message(text) {
  obj = document.getElementById("messages");
  obj.innerHTML += text + "<br />";
  obj.scrollTop = obj.scrollHeight;
}

/*
*  compileCode()
*
*  "Compiles" the code into a string (global var compiledCode)
*
*/

function compileCode() {
  reset();
  document.getElementById("messages").innerHTML = "";

  var code = document.getElementById("code").value;
  code += "\n\n";
  lines = code.split("\n");
  codeCompiledOK = true;
  labelIndex = [];
  labelPtr = 0;

  message("Indexing labels..");

  defaultCodePC = regPC = 0x600;

  for (xc=0; xc<lines.length; xc++) {
    if (! indexLabels(lines[xc])) {
      message("<b>Label already defined at line "+(xc+1)+":</b> "+lines[xc]);
      return false;
    }
  }

  str = "Found " + labelIndex.length + " label";
  if (labelIndex.length != 1) {
    str += "s";
  }
  message(str + ".");

  defaultCodePC = regPC = 0x600;
  message("Compiling code..");

  for (x=0; x<lines.length; x++) {
    if (! compileLine(lines[x], x)) {
      codeCompiledOK = false;
      break;
    }
  }

  if (codeLen == 0) {
    codeCompiledOK = false;
    message("No code to run.");
  }

  if (codeCompiledOK) {
    document.getElementById("runButton").disabled = false;
    document.getElementById("hexdumpButton").disabled = false;
    document.getElementById("compileButton").disabled = true;
    document.getElementById("fileSelect").disabled = false;
    document.getElementById("submitCode").disabled = false;
    memory[defaultCodePC] = 0x00;
  } else {
    str = lines[x].replace("<", "&lt;").replace(">", "&gt;");
    message("<b>Syntax error line " + (x+1) + ": " + str + "</b>");
    document.getElementById("runButton").disabled = true;
    document.getElementById("compileButton").disabled = false;
    document.getElementById("fileSelect").disabled = false;
    return;
  }

  updateDisplayFull();
  message("Code compiled successfully, " + codeLen + " bytes.");
}

/*
*  indexLabels() - Pushes all labels to array.
*
*/

function indexLabels(input) {

  // remove comments

  input = input.replace(new RegExp(/^(.*?);.*/), "$1");

  // trim line

  input = input.replace(new RegExp(/^\s+/), "");
  input = input.replace(new RegExp(/\s+$/), "");

  // Figure out how many bytes this instuction takes

  thisPC = defaultCodePC;

  codeLen = 0;
  //  defaultCodePC = 0x600;
  compileLine(input);
  regPC += codeLen;

  // Find command or label

  if (input.match(new RegExp(/^\w+:/))) {
    label = input.replace(new RegExp(/(^\w+):.*$/), "$1");
    return pushLabel(label + "|" + thisPC);
  }
  return true;
}

/*
*  pushLabel() - Push label to array. Return false if label already exists.
*
*/

function pushLabel(name) {
  if (findLabel(name)) {
    return false;
  }
  labelIndex[labelPtr++] = name + "|";
  return true;
}

/*
*  findLabel() - Returns true if label exists.
*
*/

function findLabel(name) {
  for (m=0; m<labelIndex.length; m++) {
    nameAndAddr = labelIndex[m].split("|");
    if (name == nameAndAddr[0]) {
      return true;
    }
  }
  return false;
}

/*
*  setLabelPC() - Associates label with address
*
*/

function setLabelPC(name, addr) {
  for (i=0; i<labelIndex.length; i++) {
    nameAndAddr = labelIndex[i].split("|");
    if (name == nameAndAddr[0]) {
      labelIndex[i] = name + "|" + addr;
      return true;
    }
  }
  return false;
}

/*
*  getLabelPC() - Get address associated with label
*
*/

function getLabelPC(name) {
  for (i=0; i<labelIndex.length; i++) {
    nameAndAddr = labelIndex[i].split("|");
    if (name == nameAndAddr[0]) {
      return (nameAndAddr[1]);
    }
  }
  return -1;
}

/*
*  compileLine()
*
*  Compiles one line of code.  Returns true if it compiled successfully,
*  false otherwise.
*/

function compileLine(input, lineno) {

  // remove comments

  input = input.replace(new RegExp(/^(.*?);.*/), "$1");

  // trim line

  input = input.replace(new RegExp(/^\s+/), "");
  input = input.replace(new RegExp(/\s+$/), "");

  // Find command or label

  if (input.match(new RegExp(/^\w+:/))) {
    label = input.replace(new RegExp(/(^\w+):.*$/), "$1");
    if (input.match(new RegExp(/^\w+:[\s]*\w+.*$/))) {
      input = input.replace(new RegExp(/^\w+:[\s]*(.*)$/), "$1");
      command = input.replace(new RegExp(/^(\w+).*$/), "$1");
    } else {
      command = "";
    }
  } else {
    command = input.replace(new RegExp(/^(\w+).*$/), "$1");
  }

  // Blank line?  Return.

  if (command == "") {
    return true;
  }

  command = command.toUpperCase();

  if (input.match(/^\*[\s]*=[\s]*[\$]?[0-9a-f]*$/)) {
    // equ spotted
    param = input.replace(new RegExp(/^[\s]*\*[\s]*=[\s]*/), "");
    if (param[0] == "$") {
      param = param.replace(new RegExp(/^\$/), "");
      addr = parseInt(param, 16);
    } else {
      addr = parseInt(param, 10);
    }
    if ((addr < 0) || (addr > 0xffff)) {
      message("Unable to relocate code outside 64k memory");
      return false;
    }
    defaultCodePC = addr;
    return true;
  }

  if (input.match(/^\w+\s+.*?$/)) {
    param = input.replace(new RegExp(/^\w+\s+(.*?)/), "$1");
  } else {
    if (input.match(/^\w+$/)) {
      param = "";
    } else {
      return false;
    }
  }

  param = param.replace(/[ ]/g, "");

  if (command == "DCB") {
    return DCB(param);
  }


  for (o=0; o<Opcodes.length; o++) {
    if (Opcodes[o][0] == command) {
      if (checkSingle(param, Opcodes[o][10])) { return true; }
      if (checkImmediate(param, Opcodes[o][1])) { return true; }
      if (checkZeroPage(param, Opcodes[o][2])) { return true; }
      if (checkZeroPageX(param, Opcodes[o][3])) { return true; }
      if (checkZeroPageY(param, Opcodes[o][4])) { return true; }
      if (checkAbsoluteX(param, Opcodes[o][6])) { return true; }
      if (checkAbsoluteY(param, Opcodes[o][7])) { return true; }
      if (checkIndirectX(param, Opcodes[o][8])) { return true; }
      if (checkIndirectY(param, Opcodes[o][9])) { return true; }
      if (checkAbsolute(param, Opcodes[o][5])) { return true; }
      if (checkBranch(param, Opcodes[o][11])) { return true; }
    }
  }
  return false; // Unknown opcode
}

/*****************************************************************************
****************************************************************************/

function DCB(param) {
  values = param.split(",");
  if (values.length == 0) { return false; }
  for (v=0; v<values.length; v++) {
    str = values[v];
    if (str != undefined && str != null && str.length > 0) {
      ch = str.substring(0, 1);
      if (ch == "$") {
        number = parseInt(str.replace(/^\$/, ""), 16);
        pushByte(number);
      } else if (ch >= "0" && ch <= "9") {
        number = parseInt(str, 10);
        pushByte(number);
      } else {
        return false;
      }
    }
  }
  return true;
}

/*
*  checkBranch() - Commom branch function for all branches (BCC, BCS, BEQ, BNE..)
*
*/

function checkBranch(param, opcode) {
  if (opcode == null) { return false; }

  addr = -1;
  if (param.match(/\w+/)) {
    addr = getLabelPC(param);
  }
  if (addr == -1) { pushWord(0x00); return false; }
  pushByte(opcode);
  if (addr < (defaultCodePC-0x600)) {  // Backwards?
    pushByte((0xff - ((defaultCodePC-0x600)-addr)) & 0xff);
    return true;
  }
  pushByte((addr-(defaultCodePC-0x600)-1) & 0xff);
  return true;
}

/*
* checkImmediate() - Check if param is immediate and push value
*
*/

function checkImmediate(param, opcode) {
  if (opcode == null) { return false; }
  if (param.match(new RegExp(/^#\$[0-9a-f]{1,2}$/i))) {
    pushByte(opcode);
    value = parseInt(param.replace(/^#\$/, ""), 16);
    if (value < 0 || value > 255) { return false; }
    pushByte(value);
    return true;
  }
  if (param.match(new RegExp(/^#[0-9]{1,3}$/i))) {
    pushByte(opcode);
    value = parseInt(param.replace(/^#/, ""), 10);
    if (value < 0 || value > 255) { return false; }
    pushByte(value);
    return true;
  }
  // Label lo/hi
  if (param.match(new RegExp(/^#[<>]\w+$/))) {
    label = param.replace(new RegExp(/^#[<>](\w+)$/), "$1");
    hilo = param.replace(new RegExp(/^#([<>]).*$/), "$1");
    pushByte(opcode);
    if (findLabel(label)) {
      addr = getLabelPC(label);
      switch(hilo) {
      case ">":
        pushByte((addr >> 8) & 0xff);
        return true;
        break;
      case "<":
        pushByte(addr & 0xff);
        return true;
        break;
      default:
        return false;
        break;
      }
    } else {
      pushByte(0x00);
      return true;
    }
  }
  return false;
}

/*
* checkIndZP() - Check indirect ZP
*
*/


/*
* checkIndirectX() - Check if param is indirect X and push value
*
*/

function checkIndirectX(param, opcode) {
  if (opcode == null) { return false; }
  if (param.match(/^\(\$[0-9a-f]{1,2},X\)$/i)) {
    pushByte(opcode);
    value = param.replace(new RegExp(/^\(\$([0-9a-f]{1,2}).*$/i), "$1");
    if (value < 0 || value > 255) { return false; }
    pushByte(parseInt(value, 16));
    return true;
  }
  return false;
}

/*
* checkIndirectY() - Check if param is indirect Y and push value
*
*/

function checkIndirectY(param, opcode) {
  if (opcode == null) { return false; }
  if (param.match(/^\(\$[0-9a-f]{1,2}\),Y$/i)) {
    pushByte(opcode);
    value = param.replace(new RegExp(/^\([\$]([0-9a-f]{1,2}).*$/i), "$1");
    if (value < 0 || value > 255) { return false; }
    pushByte(parseInt(value, 16));
    return true;
  }
  return false;
}

/*
*  checkSingle() - Single-byte opcodes
*
*/

function checkSingle(param, opcode) {
  if (opcode === null) { return false; }
  if (param != "") { return false; }
  pushByte(opcode);
  return true;
}

/*
*  checkZeroaPage() - Check if param is ZP and push value
*
*/

function checkZeroPage(param, opcode) {
  if (opcode == null) { return false; }
  if (param.match(/^\$[0-9a-f]{1,2}$/i)) {
    pushByte(opcode);
    value = parseInt(param.replace(/^\$/, ""), 16);
    if (value < 0 || value > 255) { return false; }
    pushByte(value);
    return true;
  }
  if (param.match(/^[0-9]{1,3}$/i)) {
    pushByte(opcode);
    value = parseInt(param, 10);
    if (value < 0 || value > 255) { return false; }
    pushByte(value);
    return true;
  }
  return false;
}

/*
*  checkAbsoluteX() - Check if param is ABSX and push value
*
*/

function checkAbsoluteX(param, opcode) {
  if (opcode == null) { return false; }
  if (param.match(/^\$[0-9a-f]{3,4},X$/i)) {
    pushByte(opcode);
    number = param.replace(new RegExp(/^\$([0-9a-f]*),X/i), "$1");
    value = parseInt(number, 16);
    if (value < 0 || value > 0xffff) { return false; }
    pushWord(value);
    return true;
  }

  if (param.match(/^\w+,X$/i)) {
    param = param.replace(new RegExp(/,X$/i), "");
    pushByte(opcode);
    if (findLabel(param)) {
      addr = getLabelPC(param);
      if (addr < 0 || addr > 0xffff) { return false; }
      pushWord(addr);
      return true;
    } else {
      pushWord(0x1234);
      return true;
    }
  }

  return false;
}

/*
*  checkAbsoluteY() - Check if param is ABSY and push value
*
*/

function checkAbsoluteY(param, opcode) {
  if (opcode == null) { return false; }
  if (param.match(/^\$[0-9a-f]{3,4},Y$/i)) {
    pushByte(opcode);
    number = param.replace(new RegExp(/^\$([0-9a-f]*),Y/i), "$1");
    value = parseInt(number, 16);
    if (value < 0 || value > 0xffff) { return false; }
    pushWord(value);
    return true;
  }

  // it could be a label too..

  if (param.match(/^\w+,Y$/i)) {
    param = param.replace(new RegExp(/,Y$/i), "");
    pushByte(opcode);
    if (findLabel(param)) {
      addr = getLabelPC(param);
      if (addr < 0 || addr > 0xffff) { return false; }
      pushWord(addr);
      return true;
    } else {
      pushWord(0x1234);
      return true;
    }
  }
  return false;
}

/*
*  checkZeroPageX() - Check if param is ZPX and push value
*
*/

function checkZeroPageX(param, opcode) {
  if (opcode == null) { return false; }
  if (param.match(/^\$[0-9a-f]{1,2},X/i)) {
    pushByte(opcode);
    number = param.replace(new RegExp(/^\$([0-9a-f]{1,2}),X/i), "$1");
    value = parseInt(number, 16);
    if (value < 0 || value > 255) { return false; }
    pushByte(value);
    return true;
  }
  if (param.match(/^[0-9]{1,3},X/i)) {
    pushByte(opcode);
    number = param.replace(new RegExp(/^([0-9]{1,3}),X/i), "$1");
    value = parseInt(number, 10);
    if (value < 0 || value > 255) { return false; }
    pushByte(value);
    return true;
  }
  return false;
}

function checkZeroPageY(param, opcode) {
  if (opcode == null) { return false; }
  if (param.match(/^\$[0-9a-f]{1,2},Y/i)) {
    pushByte(opcode);
    number = param.replace(new RegExp(/^\$([0-9a-f]{1,2}),Y/i), "$1");
    value = parseInt(number, 16);
    if (value < 0 || value > 255) { return false; }
    pushByte(value);
    return true;
  }
  if (param.match(/^[0-9]{1,3},Y/i)) {
    pushByte(opcode);
    number = param.replace(new RegExp(/^([0-9]{1,3}),Y/i), "$1");
    value = parseInt(number, 10);
    if (value < 0 || value > 255) { return false; }
    pushByte(value);
    return true;
  }
  return false;
}

/*
*  checkAbsolute() - Check if param is ABS and push value
*
*/

function checkAbsolute(param, opcode) {
  if (opcode == null) { return false; }
  pushByte(opcode);
  if (param.match(/^\$[0-9a-f]{3,4}$/i)) {
    value = parseInt(param.replace(/^\$/, ""), 16);
    if (value < 0 || value > 0xffff) { return false; }
    pushWord(value);
    return true;
  }
  if (param.match(/^[0-9]{1,5}$/i)) {  // Thanks, Matt!
    value = parseInt(param, 10);
    if (value < 0 || value > 65535) { return false; }
    pushWord(value);
    return(true);
  }
  // it could be a label too..
  if (param.match(/^\w+$/)) {
    if (findLabel(param)) {
      addr = (getLabelPC(param));
      if (addr < 0 || addr > 0xffff) { return false; }
      pushWord(addr);
      return true;
    } else {
      pushWord(0x1234);
      return true;
    }
  }
  return false;
}

/*****************************************************************************
****************************************************************************/

/*
*  stackPush() - Push byte to stack
*
*/

function stackPush(value) {
  if (regSP >= 0) {
    regSP--;
    memory[(regSP&0xff)+0x100] = value & 0xff;
  } else {
    message("Stack full: " + regSP);
    codeRunning = false;
  }
}

/*****************************************************************************
****************************************************************************/

/*
*  stackPop() - Pop byte from stack
*
*/

function stackPop() {
  if (regSP < 0x100) {
    value = memory[regSP+0x100];
    regSP++;
    return value;
  } else {
    message("Stack empty");
    codeRunning = false;
    return 0;
  }
}

/*
* pushByte() - Push byte to compiledCode variable
*
*/

function pushByte(value) {
  memory[defaultCodePC] = value & 0xff;
  defaultCodePC++;
  codeLen++;
}

/*
* pushWord() - Push a word using pushByte twice
*
*/

function pushWord(value) {
  pushByte(value & 0xff);
  pushByte((value>>8) & 0xff);
}

/*
* popByte() - Pops a byte
*
*/

function popByte() {
  return(memory[regPC++] & 0xff);
}

/*
* popWord() - Pops a word using popByte() twice
*
*/

function popWord() {
  return popByte() + (popByte() << 8);
}

/*
* memStoreByte() - Poke a byte, don't touch any registers
*
*/

function memStoreByte(addr, value) {
  memory[ addr ] = (value & 0xff);
  if ((addr >= 0x200) && (addr<=0x5ff)) {
    display[addr-0x200].background = palette[memory[addr] & 0x0f];
  }
}

/*
*  submitCode() - Submits code (using XMLHttpRequest) to be published (moderated)
*
*/

function submitCode() {
  var confirmMessage = "Warning: This will submit your code to 6502asm.com for moderation.\n";
  confirmMessage += "Approved code will be published on the website.";
  if (!confirm(confirmMessage)) {
    return;
  }

  // Let's submit it
  xmlhttp = new XMLHttpRequest();

  xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState==4 && xmlhttp.status==200) {
      message("-- Thank you for sharing your code with other 6502asm.com users.");
      message("-- Your code has been submitted for moderation.");
      message("-- Once approved, it will be published on the website.");
      if (xmlhttp.responseText != "") {
        alert("An error occoured while submitting your code.  The error message was:\n" +
          xmlhttp.responseText + "\n" +
        "Please try again later.");
      }
    }
  }
  var code = document.getElementById("code").value;
  var params = "code=" + code;
  xmlhttp.open("POST", "submit.php", true);
  xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  xmlhttp.setRequestHeader("Content-length", params.length);
  xmlhttp.setRequestHeader("Connection", "close");
  xmlhttp.send(params);
}

/*
*  hexDump() - Dump binary as hex to new window
*
*/

function addr2hex(addr) {
  return num2hex((addr>>8)&0xff)+num2hex(addr&0xff);
}

function num2hex(nr) {
  str = "0123456789abcdef";
  hi = ((nr&0xf0)>>4);
  lo = (nr&15);
  return str.substring(hi, hi+1 ) + str.substring(lo, lo+1);
}

function hexdump() {
  w = window.open('', 'hexdump', 'width=500,height=300,resizable=yes,scrollbars=yes,toolbar=no,location=no,menubar=no,status=no');

  html = "<html><head>";
  html += "<link href='style.css' rel='stylesheet' type='text/css' />";
  html += "<title>hexdump</title></head><body>";
  html += "<code>";
  for (x=0; x<codeLen; x++) {
    if ((x&15) == 0) {
      html += "<br/> ";
      n = (0x600+x);
      html += num2hex(((n>>8)&0xff));
      html += num2hex((n&0xff));
      html += ": ";
    }
    html += num2hex(memory[0x600+x]);
    if (x&1) { html += " "; }
  }
  if ((x&1)) { html += "-- [END]"; }
  html += "</code></body></html>";
  w.document.write(html);
  w.document.close();
}

/*
*  runBinary() - Executes the compiled code
*
*/

function runBinary() {
  if (codeRunning) {
    /* Switch OFF everything */
    codeRunning = false;
    document.getElementById("runButton").value = "Run";
    document.getElementById("hexdumpButton").disabled = false;
    document.getElementById("fileSelect").disabled = false;
    document.getElementById("submitCode").disabled = false;
    //    document.getElementById("watch").disabled = true;
    toggleDebug();
    stopDebugger();
    clearInterval(myInterval);
  } else {
    document.getElementById("runButton").value = "Stop";
    document.getElementById("fileSelect").disabled = true;
    document.getElementById("hexdumpButton").disabled = true;
    document.getElementById("submitCode").disabled = true;
    codeRunning = true;
    myInterval = setInterval("multiexecute()", 1);
    document.getElementById("stepButton").disabled = !debug;
    document.getElementById("gotoButton").disabled = !debug;
  }
}

/*
*  readZeroPage() - Get value from ZP
*
*/

function jumpBranch(offset) {
  if (offset > 0x7f) {
    regPC = (regPC - (0x100 - offset));
  } else {
    regPC = (regPC + offset);
  }
}

function doCompare(reg, val) {
  //  if ((reg+val) > 0xff) regP |= 1; else regP &= 0xfe;
  if (reg>=val) {
    regP |= 1;
  } else {
    regP &= 0xfe; // Thanks, "Guest"
  }
  val = (reg-val);
  if (val) {
    regP &= 0xfd;
  } else {
    regP |= 0x02;
  }
  if (val & 0x80) {
    regP |= 0x80;
  } else {
    regP &= 0x7f;
  }
}

function testSBC(value) {
  if ((regA ^ value) & 0x80) {
    vflag = 1;
  } else {
    vflag = 0;
  }

  if (regP & 8) {
    tmp = 0xf + (regA & 0xf) - (value & 0xf) + (regP&1);
    if (tmp < 0x10) {
      w = 0;
      tmp -= 6;
    } else {
      w = 0x10;
      tmp -= 0x10;
    }
    w += 0xf0 + (regA & 0xf0) - (value & 0xf0);
    if (w < 0x100) {
      regP &= 0xfe;
      if ((regP&0xbf) && w<0x80) { regP&=0xbf; }
      w -= 0x60;
    } else {
      regP |= 1;
      if ((regP&0xbf) && w>=0x180) { regP&=0xbf; }
    }
    w += tmp;
  } else {
    w = 0xff + regA - value + (regP&1);
    if (w<0x100) {
      regP &= 0xfe;
      if ((regP&0xbf) && w<0x80) { regP&=0xbf; }
    } else {
      regP |= 1;
      if ((regP&0xbf) && w>= 0x180) { regP&=0xbf; }
    }
  }
  regA = w & 0xff;
  if (regA) {
    regP &= 0xfd;
  } else {
    regP |= 0x02;
  }
  if (regA & 0x80) {
    regP |= 0x80;
  } else {
    regP &= 0x7f;
  }
}

function testADC(value) {
  if ((regA ^ value) & 0x80) {
    regP &= 0xbf;
  } else {
    regP |= 0x40;
  }

  if (regP & 8) {
    tmp = (regA & 0xf) + (value & 0xf) + (regP&1);
    if (tmp >= 10) {
      tmp = 0x10 | ((tmp+6)&0xf);
    }
    tmp += (regA & 0xf0) + (value & 0xf0);
    if (tmp >= 160) {
      regP |= 1;
      if ((regP&0xbf) && tmp >= 0x180) { regP &= 0xbf; }
      tmp += 0x60;
    } else {
      regP &= 0xfe;
      if ((regP&0xbf) && tmp<0x80) { regP &= 0xbf; }
    }
  } else {
    tmp = regA + value + (regP&1);
    if (tmp >= 0x100) {
      regP |= 1;
      if ((regP&0xbf) && tmp>=0x180) { regP &= 0xbf; }
    } else {
      regP &= 0xfe;
      if ((regP&0xbf) && tmp<0x80) { regP &= 0xbf; }
    }
  }
  regA = tmp & 0xff;
  if (regA) {
    regP &= 0xfd;
  } else {
    regP |= 0x02;
  }
  if (regA & 0x80) {
    regP |= 0x80;
  } else {
    regP &= 0x7f;
  }
}

function multiexecute() {
  if (! debug) {
    for (var w=0; w<64; w++) {
      execute();
      execute();
    }
  }
}

/*
*  execute() - Executes one instruction.
*              This is the main part of the CPU emulator.
*
*/

function execute() {
  if (! codeRunning) { return; }

  memory[0xfe]=Math.floor(Math.random()*256);
  inst[popByte()]();

  if ((regPC == 0) || (!codeRunning)) {
    clearInterval(myInterval);
    message("Program end at PC=$" + addr2hex(regPC-1));
    codeRunning = false;
    document.getElementById("stepButton").disabled = true;
    document.getElementById("gotoButton").disabled = true;
    document.getElementById("runButton").value = "Run";
    document.getElementById("fileSelect").disabled = false;
    document.getElementById("hexdumpButton").disabled = false;
    document.getElementById("submitCode").disabled = false;
  }
}


/*
*  updatePixelDisplay() - Updates the display at one pixel position
*
*/

function updateDisplayPixel(addr) {
  display[addr-0x200].background = palette[memory[addr] & 0x0f];
}


/*
*  updateDisplayFull() - Simply redraws the entire display according to memory
*  The colors are supposed to be identical with the C64's palette.
*
*/

function updateDisplayFull() {
  for (y=0; y<32; y++) {
    for (x=0; x<32; x++) {
      updateDisplayPixel(((y<<5)+x) + 0x200);
    }
  }
}

