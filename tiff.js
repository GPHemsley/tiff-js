/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

function TIFFParser() {
	this.tiffDataView = undefined;
	this.littleEndian = undefined;
	this.fileDirectories = [];
};

TIFFParser.prototype = {
	isLittleEndian: function () {
		// Get byte order mark.
		var BOM = this.getBytes(2, 0);

		// Find out the endianness.
		if (BOM === 0x4949) {
			this.littleEndian = true;
		} else if (BOM === 0x4D4D) {
			this.littleEndian = false;
		} else {
			console.log( BOM );
			throw TypeError("Invalid byte order value.");
		}

		return this.littleEndian;
	},

	hasTowel: function () {
		// Check for towel.
		if (this.getBytes(2, 2) !== 42) {
			throw RangeError("You forgot your towel!");
			return false;
		}

		return true;
	},

	getFieldTagName: function (fieldTag) {
		// See: http://www.digitizationguidelines.gov/guidelines/TIFF_Metadata_Final.pdf
		// See: http://www.digitalpreservation.gov/formats/content/tiff_tags.shtml
		const fieldTagNames = {
			// TIFF Baseline
			0x013B: 'Artist',
			0x0102: 'BitsPerSample',
			0x0109: 'CellLength',
			0x0108: 'CellWidth',
			0x0140: 'ColorMap',
			0x0103: 'Compression',
			0x8298: 'Copyright',
			0x0132: 'DateTime',
			0x0152: 'ExtraSamples',
			0x010A: 'FillOrder',
			0x0121: 'FreeByteCounts',
			0x0120: 'FreeOffsets',
			0x0123: 'GrayResponseCurve',
			0x0122: 'GrayResponseUnit',
			0x013C: 'HostComputer',
			0x010E: 'ImageDescription',
			0x0101: 'ImageLength',
			0x0100: 'ImageWidth',
			0x010F: 'Make',
			0x0119: 'MaxSampleValue',
			0x0118: 'MinSampleValue',
			0x0110: 'Model',
			0x00FE: 'NewSubfileType',
			0x0112: 'Orientation',
			0x0106: 'PhotometricInterpretation',
			0x011C: 'PlanarConfiguration',
			0x0128: 'ResolutionUnit',
			0x0116: 'RowsPerStrip',
			0x0115: 'SamplesPerPixel',
			0x0131: 'Software',
			0x0117: 'StripByteCounts',
			0x0111: 'StripOffsets',
			0x00FF: 'SubfileType',
			0x0107: 'Threshholding',
			0x011A: 'XResolution',
			0x011B: 'YResolution',

			// TIFF Extended
			0x0146: 'BadFaxLines',
			0x0147: 'CleanFaxData',
			0x0157: 'ClipPath',
			0x0148: 'ConsecutiveBadFaxLines',
			0x01B1: 'Decode',
			0x01B2: 'DefaultImageColor',
			0x010D: 'DocumentName',
			0x0150: 'DotRange',
			0x0141: 'HalftoneHints',
			0x015A: 'Indexed',
			0x015B: 'JPEGTables',
			0x011D: 'PageName',
			0x0129: 'PageNumber',
			0x013D: 'Predictor',
			0x013F: 'PrimaryChromaticities',
			0x0214: 'ReferenceBlackWhite',
			0x0153: 'SampleFormat',
			0x022F: 'StripRowCounts',
			0x014A: 'SubIFDs',
			0x0124: 'T4Options',
			0x0125: 'T6Options',
			0x0145: 'TileByteCounts',
			0x0143: 'TileLength',
			0x0144: 'TileOffsets',
			0x0142: 'TileWidth',
			0x012D: 'TransferFunction',
			0x013E: 'WhitePoint',
			0x0158: 'XClipPathUnits',
			0x011E: 'XPosition',
			0x0211: 'YCbCrCoefficients',
			0x0213: 'YCbCrPositioning',
			0x0212: 'YCbCrSubSampling',
			0x0159: 'YClipPathUnits',
			0x011F: 'YPosition',

			// EXIF
			0x9202: 'ApertureValue',
			0xA001: 'ColorSpace',
			0x9004: 'DateTimeDigitized',
			0x9003: 'DateTimeOriginal',
			0x8769: 'Exif IFD',
			0x9000: 'ExifVersion',
			0x829A: 'ExposureTime',
			0xA300: 'FileSource',
			0x9209: 'Flash',
			0xA000: 'FlashpixVersion',
			0x829D: 'FNumber',
			0xA420: 'ImageUniqueID',
			0x9208: 'LightSource',
			0x927C: 'MakerNote',
			0x9201: 'ShutterSpeedValue',
			0x9286: 'UserComment',

			// IPTC
			0x83BB: 'IPTC',

			// ICC
			0x8773: 'ICC Profile',

			// XMP
			0x02BC: 'XMP',

			// GDAL
			0xA480: 'GDAL_METADATA',
			0xA481: 'GDAL_NODATA',

			// Photoshop
			0x8649: 'Photoshop',
		};

		var fieldTagName;

		if (fieldTag in fieldTagNames) {
			fieldTagName = fieldTagNames[fieldTag];
		} else {
			console.log( "Unknown Field Tag:", fieldTag);
			fieldTagName = "Tag" + fieldTag;
		}

		return fieldTagName;
	},

	getFieldTypeName: function (fieldType) {
		const fieldTypeNames = {
			0x0001: 'BYTE',
			0x0002: 'ASCII',
			0x0003: 'SHORT',
			0x0004: 'LONG',
			0x0005: 'RATIONAL',
			0x0006: 'SBYTE',
			0x0007: 'UNDEFINED',
			0x0008: 'SSHORT',
			0x0009: 'SLONG',
			0x000A: 'SRATIONAL',
			0x000B: 'FLOAT',
			0x000C: 'DOUBLE',
		};

		var fieldTypeName;

		if (fieldType in fieldTypeNames) {
			fieldTypeName = fieldTypeNames[fieldType];
		}

		return fieldTypeName;
	},

	getFieldTypeLength: function (fieldTypeName) {
		var fieldTypeLength;

		if (['BYTE', 'ASCII', 'SBYTE', 'UNDEFINED'].indexOf(fieldTypeName) !== -1) {
			fieldTypeLength = 1;
		} else if (['SHORT', 'SSHORT'].indexOf(fieldTypeName) !== -1) {
			fieldTypeLength = 2;
		} else if (['LONG', 'SLONG', 'FLOAT'].indexOf(fieldTypeName) !== -1) {
			fieldTypeLength = 4;
		} else if (['RATIONAL', 'SRATIONAL', 'DOUBLE'].indexOf(fieldTypeName) !== -1) {
			fieldTypeLength = 8;
		}

		return fieldTypeLength;
	},

	getBytes: function (numBytes, offset) {
		if (numBytes === 1) {
			return this.tiffDataView.getUint8(offset, this.littleEndian);
		} else if (numBytes === 2) {
			return this.tiffDataView.getUint16(offset, this.littleEndian);
		} else if (numBytes === 4) {
			return this.tiffDataView.getUint32(offset, this.littleEndian);
//		} else if (numBytes === 8) {
//			return this.tiffDataView.getUint64(offset, this.littleEndian);
		} else {
			console.log( numBytes, offset );
			throw RangeError("Number of bytes requested out of range");
		}
	},

	getFieldValues: function (fieldTagName, fieldTypeName, typeCount, valueOffset) {
		var fieldValues = [];

		var fieldTypeLength = this.getFieldTypeLength(fieldTypeName);
		var fieldValueSize = fieldTypeLength * typeCount;

		if (fieldValueSize <= 4) {
			// The value is stored at the big end of the valueOffset.
			if (this.littleEndian === false) {
				var value = valueOffset >>> ((4 - fieldTypeLength) * 8);
			} else {
				var value = valueOffset;
			}

			fieldValues.push(value);
		} else {
			for (var i = 0; i < typeCount; i++) {
				var indexOffset = fieldTypeLength * i;

				if (fieldTypeLength >= 8) {
					if (['RATIONAL', 'SRATIONAL'].indexOf(fieldTypeName) !== -1) {
						// Numerator
						fieldValues.push(this.getBytes(4, valueOffset + indexOffset));
						// Denominator
						fieldValues.push(this.getBytes(4, valueOffset + indexOffset + 4));
//					} else if (['DOUBLE'].indexOf(fieldTypeName) !== -1) {
//						fieldValues.push(this.getBytes(4, valueOffset + indexOffset) + this.getBytes(4, valueOffset + indexOffset + 4));
					} else {
						console.log( fieldTypeName, typeCount, fieldValueSize );
						throw TypeError("Can't handle this field type or size");
					}
				} else {
					fieldValues.push(this.getBytes(fieldTypeLength, valueOffset + indexOffset));
				}
			}
		}

		if (fieldTypeName === 'ASCII') {
			fieldValues.forEach(function(e, i, a) { a[i] = String.fromCharCode(e); });
		}

		return fieldValues;
	},

	makeRGBAFillValue: function(r, g, b, a = 1.0) {
		return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
	},

	parseFileDirectory: function (byteOffset) {
		var numDirEntries = this.getBytes(2, byteOffset);

		var tiffFields = [];

		for (var i = byteOffset + 2, entryCount = 0; entryCount < numDirEntries; i += 12, entryCount++) {
			var fieldTag = this.getBytes(2, i);
			var fieldType = this.getBytes(2, i + 2);
			var typeCount = this.getBytes(4, i + 4);
			var valueOffset = this.getBytes(4, i + 8);

			var fieldTagName = this.getFieldTagName( fieldTag );
			var fieldTypeName = this.getFieldTypeName( fieldType );

			var fieldValues = this.getFieldValues(fieldTagName, fieldTypeName, typeCount, valueOffset);

//			console.log( fieldTagName + ' (0x' + fieldTag.toString(16).toUpperCase() + ')', fieldTypeName + ' (' + fieldType + ')', typeCount, valueOffset, '0x' + valueOffset.toString(16).toUpperCase() );

			tiffFields[fieldTagName] = { 'type': fieldTypeName, 'values': fieldValues };
		}

		this.fileDirectories.push( tiffFields );

		var nextIFDByteOffset = this.getBytes(4, i);

		if (nextIFDByteOffset === 0x00000000) {
			return this.fileDirectories;
		} else {
			return this.parseFileDirectory(nextIFDByteOffset);
		}
	},

	parseTIFF: function (tiffArrayBuffer, canvas = document.createElement("canvas")) {
		this.tiffDataView = new DataView(tiffArrayBuffer);
		this.canvas = canvas;

		this.littleEndian = this.isLittleEndian(this.tiffDataView);

		if (!this.hasTowel(this.tiffDataView, this.littleEndian)) {
			return;
		}

		var firstIFDByteOffset = this.getBytes(4, 4);

		this.fileDirectories = this.parseFileDirectory(firstIFDByteOffset);

		var fileDirectory = this.fileDirectories[0];

		console.log( fileDirectory );

		var imageWidth = fileDirectory.ImageWidth.values[0];
		var imageLength = fileDirectory.ImageLength.values[0];

		this.canvas.width = imageWidth;
		this.canvas.height = imageLength;

		var strips = [];

		var compression = (fileDirectory.Compression) ? fileDirectory.Compression.values[0] : 1;

		var samplesPerPixel = fileDirectory.SamplesPerPixel.values[0];

		var bytesPerSampleValues = [];
		var bytesPerPixel = 0;

		fileDirectory.BitsPerSample.values.forEach(function(bitsPerSample, i, bitsPerSampleValues) {
			// XXX: Could we handle odd bit lengths?
			if ( bitsPerSample % 8 !== 0 ) {
				throw RangeError("Cannot handle sub-byte bits per sample");
				return;
			}

			bytesPerSampleValues[i] = bitsPerSample / 8;
			bytesPerPixel += bytesPerSampleValues[i];
		}, this);

		var stripOffsetValues = fileDirectory.StripOffsets.values;

		// StripByteCounts is supposed to be required, but see if we can recover anyway.
		if (fileDirectory.StripByteCounts) {
			var stripByteCountValues = fileDirectory.StripByteCounts.values;
		} else {
			console.log("Missing StripByteCounts!");

			// Infer StripByteCounts, if possible.
			if (stripOffsetValues.length === 1) {
				var stripByteCountValues = [imageWidth * imageLength * bytesPerPixel];
			} else {
				throw Error("Cannot recover from missing StripByteCounts");
			}
		}

		// Loop through strips and decompress as necessary.
		stripOffsetValues.forEach(function(stripOffset, i, stripOffsetValues) {
			strips[i] = [];

			var stripByteCount = stripByteCountValues[i];

			// Loop through pixels.
			for (var j = 0, jIncrement = 1, getHeader = true, pixel = [], numBytes = 0, sample = 0, currentSample = 0; j < stripByteCount; j += jIncrement) {
				// Decompress strip.
				switch (compression) {
					// Uncompressed
					case 1:
						// Loop through samples (sub-pixels).
						for (var m = 0, pixel = []; m < samplesPerPixel; m++) {
							var sampleOffset = bytesPerSampleValues[m] * m;

							pixel.push(this.getBytes(bytesPerSampleValues[m], stripOffset + j + sampleOffset));
						}

						strips[i].push(pixel);

						jIncrement = bytesPerPixel;
					break;

					// CITT Group 3 1-Dimensional Modified Huffman run-length encoding
					case 2:
						// XXX: Use PDF.js code?
					break;

					// Group 3 Fax
					case 3:
						// XXX: Use PDF.js code?
					break;

					// Group 4 Fax
					case 4:
						// XXX: Use PDF.js code?
					break;

					// LZW
					case 5:
						// XXX: Use PDF.js code?
					break;

					// Old-style JPEG (TIFF 6.0)
					case 6:
						// XXX: Use PDF.js code?
					break;

					// New-style JPEG (TIFF Specification Supplement 2)
					case 7:
						// XXX: Use PDF.js code?
					break;

					// PackBits
					case 32773:
						// Are we ready for a new block?
						if (getHeader) {
							getHeader = false;

							var blockLength = 1;
							var iterations = 1;

							// The header byte is signed.
							var header = this.tiffDataView.getInt8(stripOffset + j, this.littleEndian);

							if ((header >= 0) && (header <= 127)) { // Normal pixels.
								blockLength = header + 1;
							} else if ((header >= -127) && (header <= -1)) { // Collapsed pixels.
								iterations = -header + 1;
							} else /*if (header === -128)*/ { // Placeholder byte?
								getHeader = true;
							}
						} else {
							var currentByte = this.getBytes(1, stripOffset + j);

							// Duplicate bytes, if necessary.
							for (var m = 0; m < iterations; m++) {
								// We're reading one byte at a time, so we need to handle multi-byte samples.
								currentSample = (currentSample << (8 * numBytes)) | currentByte;
								numBytes++;

								// Is our sample complete?
								if (numBytes === bytesPerSampleValues[sample]) {
									pixel.push(currentSample);
									currentSample = numBytes = 0;
									sample++;
								}

								// Is our pixel complete?
								if (sample === samplesPerPixel)
								{
									strips[i].push(pixel);

									pixel = [];
									sample = 0;
								}
							}

							blockLength--;

							// Is our block complete?
							if (blockLength === 0) {
								getHeader = true;
							}
						}

						jIncrement = 1;
					break;

					// Unknown compression algorithm
					default:
						// Do not attempt to parse the image data.
					break;
				}
			}

//			console.log( strips[i] );
		}, this);

//		console.log( strips );

		if (canvas.getContext) {
			var ctx = this.canvas.getContext("2d");

			// Set a default fill style.
			ctx.fillStyle = this.makeRGBAFillValue(255, 255, 255, 0);

			// If RowsPerStrip is missing, the whole image is in one strip.
			if (fileDirectory.RowsPerStrip) {
				var rowsPerStrip = fileDirectory.RowsPerStrip.values[0];
			} else {
				var rowsPerStrip = imageLength;
			}

			var numStrips = strips.length;

			var imageLengthModRowsPerStrip = imageLength % rowsPerStrip;
			var rowsInLastStrip = (imageLengthModRowsPerStrip === 0) ? rowsPerStrip : imageLengthModRowsPerStrip;

			var numRowsInStrip = rowsPerStrip;
			var numRowsInPreviousStrip = 0;

			var photometricInterpretation = fileDirectory.PhotometricInterpretation.values[0];

			var extraSamplesValues = [];
			var numExtraSamples = 0;

			if (fileDirectory.ExtraSamples) {
				extraSamplesValues = fileDirectory.ExtraSamples.values;
				numExtraSamples = extraSamplesValues.length;
			}

			if (fileDirectory.ColorMap) {
				var colorMapValues = fileDirectory.ColorMap.values;
				var colorMapSampleSize = Math.pow(2, bytesPerSampleValues[0] * 8);
			}

			// Loop through the strips in the image.
			for (var i = 0; i < numStrips; i++) {
				// The last strip may be short.
				if ((i + 1) === numStrips) {
					numRowsInStrip = rowsInLastStrip;
				}

				var numPixels = strips[i].length;
				var yPadding = numRowsInPreviousStrip * i;

				// Loop through the rows in the strip.
				for (var y = 0, j = 0; y < numRowsInStrip, j < numPixels; y++) {
					// Loop through the pixels in the row.
					for (var x = 0; x < imageWidth; x++, j++) {
						var pixelSamples = strips[i][j];

						var red = 0;
						var green = 0;
						var blue = 0;
						var opacity = 1.0;

						if (numExtraSamples > 0) {
							for (var k = 0; k < numExtraSamples; k++) {
								if (extraSamplesValues[k] === 1) {
									opacity = pixelSamples[3 + k] / 256;

									break;
								}
							}
						}

						switch (photometricInterpretation) {
							// Bilevel or Grayscale
							// WhiteIsZero
							case 0:
								var invertValue = Math.pow(0x10, bytesPerSampleValues[0] * 2);

								// Invert samples.
								pixelSamples.forEach(function(sample, index, samples) { samples[index] = invertValue - sample; });

							// Bilevel or Grayscale
							// BlackIsZero
							case 1:
								red = green = blue = pixelSamples[0];
							break;

							// RGB Full Color
							case 2:
								red = pixelSamples[0];
								green = pixelSamples[1];
								blue = pixelSamples[2];
							break;

							// RGB Color Palette
							case 3:
								if (colorMapValues === undefined) {
									throw Error("Palette image missing color map");
								}

								var colorMapIndex = pixelSamples[0];

								red = Math.floor(colorMapValues[colorMapIndex] / 256);
								green = Math.floor(colorMapValues[colorMapSampleSize + colorMapIndex] / 256);
								blue = Math.floor(colorMapValues[(2 * colorMapSampleSize) + colorMapIndex] / 256);
							break;

							// Transparency mask
							case 4:
							break;

							// CMYK
							case 5:
							break;

							// YCbCr
							case 6:
							break;

							// CIELab
							case 8:
							break;

							// Unknown Photometric Interpretation
							default:
							break;
						}

						ctx.fillStyle = this.makeRGBAFillValue(red, green, blue, opacity);
						ctx.fillRect(x, yPadding + y, 1, 1);
					}
				}

				numRowsInPreviousStrip = numRowsInStrip;
			}
		}

/*		for (var i = 0, numFileDirectories = this.fileDirectories.length; i < numFileDirectories; i++) {
			// Stuff
		}*/

		return this.canvas;
	},
}
