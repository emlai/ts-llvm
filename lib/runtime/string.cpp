#include <cstdint>
#include <cstring>
#include "string.h"
#include "gc.h"

extern "C" {

string string__concat(string a, string b) {
  auto length = a.length + b.length;
  auto* data = static_cast<uint8_t*>(gc__allocate(length));
  memcpy(data, a.data, a.length);
  memcpy(data + a.length, b.data, b.length);
  return { data, length };
}

}
