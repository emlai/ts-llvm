#include "string.h"
#include <cstdio>

extern "C" {

void console__log(string str) {
  fwrite(str.data, 1, str.length, stdout);
  fwrite("\n", 1, 1, stdout);
}

}
