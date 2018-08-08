#include <cstdlib>
#include <cstdint>

extern "C" {

void* gc__allocate(uint32_t bytes) {
  return malloc(bytes);
}

}
