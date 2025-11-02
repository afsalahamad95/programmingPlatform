package logger

// LogPtr logs the pointer value only if pointer is not nil
func LogPtr[T any](p *T) any {
	if p == nil {
		return "<nil>"
	}

	return *p
}
